import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import {
  crearDeclaracion,
  actualizarDeclaracion,
  obtenerDeclaracion,
  listarDeclaraciones,
  subirDocumentoDeclaracion,
} from "@/lib/db/repositories/declaracion-tributaria.repository";
import { extraerDeclaracionTributaria } from "@/lib/facturacion/impuestos/extraer-declaracion";
import { presentarDeclaracionConCredito } from "@/lib/facturacion/impuestos/presentar-declaracion";
import { guardarArchivo } from "@/lib/storage/local-storage";

const IMPUESTOS_APP_CODIGO = "IMPUESTOS_EMPRESA";

const TAMANO_MAX_BYTES = 15 * 1024 * 1024;
const TIPOS_PERMITIDOS: Record<string, { mime: "application/pdf" | "image/png" | "image/jpeg"; extension: string }> = {
  "application/pdf": { mime: "application/pdf", extension: "pdf" },
  "image/png": { mime: "image/png", extension: "png" },
  "image/jpeg": { mime: "image/jpeg", extension: "jpg" },
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

// Mismo criterio que ocrDisponible() en rrhh-contratos-importacion.ts: sin
// la clave configurada ni se intenta la llamada -- se devuelve un error
// claro en vez de dejar que el SDK de OpenAI tire su propio error de
// autenticacion crudo hacia la UI.
function iaDisponible(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

// Fecha de vencimiento de SUNAT (cronograma por ultimo digito de RUC) no
// viene en la constancia y cambia cada año -- esto es solo un valor
// provisional para que la declaracion se pueda crear sin bloquear la carga
// masiva. Nunca pisa un vencimiento ya guardado: SP_DECLARACION_TRIBUTARIA_CREAR
// solo lo usa en el INSERT (declaracion nueva), si ya existia lo deja intacto.
function vencimientoProvisional(tipoDeclaracion: "IGV_RENTA_MENSUAL" | "DJ_ANUAL_RENTA", anio: number, mes: number): string {
  if (tipoDeclaracion === "DJ_ANUAL_RENTA") return `${anio + 1}-03-31`;
  let anioVenc = anio;
  let mesVenc = mes + 1;
  if (mesVenc > 12) {
    mesVenc = 1;
    anioVenc += 1;
  }
  return `${anioVenc}-${String(mesVenc).padStart(2, "0")}-20`;
}

// Procesa UN archivo por llamada (el cliente sube varios en paralelo, cada
// uno con su propio POST -- ver ImportarDeclaracionesForm). Por archivo:
// 1) lo lee con IA para identificar tipo/periodo/montos, 2) crea (o
// encuentra, idempotente por periodo) la declaracion, 3) si sigue en
// BORRADOR, completa los montos con lo extraido (si todavia no los tenia)
// y la pasa a PRESENTADA -- subir la constancia de SUNAT por esta via
// significa, por definicion, que la declaracion ya se presento (decision
// de negocio del 2026-11-25), nunca se sobrescriben datos ya cargados ni
// se toca una declaracion que ya avanzo de estado, 4) adjunta el archivo
// original como constancia. Si la IA no logra identificar tipo+periodo
// con confianza, no crea nada -- el archivo queda para subir a mano desde
// "Nueva declaracion".
export async function POST(request: Request) {
  const sesion = await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const formData = await request.formData();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ ok: false, error: "Archivo invalido." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "El archivo supera los 15 MB." }, { status: 400 });
  }
  const tipoArchivo = TIPOS_PERMITIDOS[archivo.type];
  if (!tipoArchivo) {
    return NextResponse.json({ ok: false, error: "Solo se aceptan PDF, PNG o JPG." }, { status: 400 });
  }

  if (!iaDisponible()) {
    return NextResponse.json({ ok: false, error: "La lectura automatica (IA) todavia no esta activada en este entorno." }, { status: 200 });
  }

  const bytesArchivo = new Uint8Array(await archivo.arrayBuffer());

  let datos;
  try {
    datos = await extraerDeclaracionTributaria(bytesArchivo, tipoArchivo.mime);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido al analizar el archivo." },
      { status: 200 },
    );
  }

  const faltaMes = datos.tipoDeclaracion === "IGV_RENTA_MENSUAL" && !datos.mes;
  if (!datos.tipoDeclaracion || !datos.anio || faltaMes) {
    return NextResponse.json({ ok: false, motivo: "no_identificado", advertencias: datos.advertencias }, { status: 200 });
  }

  const tipos = await listarMaestros("TIPO_DECLARACION_TRIBUTARIA");
  const tipo = tipos.find((t) => t.CODIGO === datos.tipoDeclaracion);
  if (!tipo) {
    return NextResponse.json({ ok: false, error: `No existe en el catalogo el tipo "${datos.tipoDeclaracion}".` }, { status: 200 });
  }

  const mes = datos.tipoDeclaracion === "DJ_ANUAL_RENTA" ? 0 : datos.mes!;
  const existentes = await listarDeclaraciones(tipo.ID_MAESTRO, datos.anio);
  const existiaAntes = existentes.some((d) => d.MES === mes);

  const { id_declaracion } = await crearDeclaracion(
    tipo.ID_MAESTRO,
    datos.anio,
    mes,
    vencimientoProvisional(datos.tipoDeclaracion, datos.anio, mes),
    sesion.idUsuario,
  );
  if (!id_declaracion) {
    return NextResponse.json({ ok: false, error: "No se pudo crear la declaracion." }, { status: 200 });
  }

  const declaracion = await obtenerDeclaracion(id_declaracion);
  if (!declaracion) {
    return NextResponse.json({ ok: false, error: "La declaracion no se encontro despues de crearla." }, { status: 200 });
  }

  const advertencias = [...datos.advertencias];
  if (!existiaAntes) {
    advertencias.push("Fecha de vencimiento provisional -- verifica el cronograma real de SUNAT de ese año y corrigela si hace falta.");
  }

  const datosYaCargados = datos.tipoDeclaracion === "IGV_RENTA_MENSUAL" ? declaracion.IGV_RESULTANTE !== null : declaracion.SALDO_RENTA !== null;

  if (declaracion.ESTADO_DECLARACION_CODIGO === "BORRADOR") {
    if (!datosYaCargados) {
      // El "importe total a pagar" que lee la IA a veces no coincide con
      // la suma de sus propios campos (caso real: constancia con IGV
      // resultante positivo y pago a cuenta Renta > 0, pero la IA
      // devolvio 0 a pagar). Nunca se confia ciegamente en ese campo --
      // se usa el mayor entre lo que la IA leyo y lo que se puede derivar
      // de IGV_RESULTANTE/PAGO_A_CUENTA_RENTA (o SALDO_RENTA en la
      // anual), para no subregistrar un monto pendiente real.
      const montoCalculado =
        datos.tipoDeclaracion === "IGV_RENTA_MENSUAL"
          ? Math.max(datos.igvResultante ?? 0, 0) + Math.max(datos.pagoACuentaRenta ?? 0, 0)
          : Math.max(datos.saldoRenta ?? 0, 0);
      const montoTotalAPagar = Math.max(datos.montoTotalAPagar ?? 0, montoCalculado);
      if (montoTotalAPagar > (datos.montoTotalAPagar ?? 0)) {
        advertencias.push(
          `El monto a pagar leido (${(datos.montoTotalAPagar ?? 0).toFixed(2)}) no coincidia con la suma de sus propios montos -- se uso ${montoTotalAPagar.toFixed(2)}, verificalo contra la constancia.`,
        );
      }

      await actualizarDeclaracion({
        idDeclaracion: id_declaracion,
        fechaVencimiento: declaracion.FECHA_VENCIMIENTO,
        ventasGravadas: datos.ventasGravadas,
        comprasGravadas: datos.comprasGravadas,
        igvVentas: datos.igvVentas,
        igvCompras: datos.igvCompras,
        igvResultante: datos.igvResultante,
        pagoACuentaRenta: datos.pagoACuentaRenta,
        impuestoCalculadoRenta: datos.impuestoCalculadoRenta,
        pagosACuentaAcumulados: datos.pagosACuentaAcumulados,
        saldoRenta: datos.saldoRenta,
        montoTotalAPagar,
        notas: declaracion.NOTAS,
        idUsuarioModificacion: sesion.idUsuario,
      });
    } else {
      advertencias.push("Esta declaracion ya tenia montos cargados -- no se sobrescribieron, se presento con lo que ya tenia.");
    }

    // Subir la constancia por esta via implica que SUNAT ya la recibio --
    // se pasa a PRESENTADA de una vez (ver presentar-declaracion.ts), no
    // se deja en BORRADOR esperando un click manual aparte.
    const igvResultanteFinal =
      datos.tipoDeclaracion === "IGV_RENTA_MENSUAL"
        ? datosYaCargados
          ? declaracion.IGV_RESULTANTE !== null
            ? Number(declaracion.IGV_RESULTANTE)
            : null
          : datos.igvResultante
        : null;
    const pagoACuentaRentaFinal =
      datos.tipoDeclaracion === "IGV_RENTA_MENSUAL"
        ? datosYaCargados
          ? declaracion.PAGO_A_CUENTA_RENTA !== null
            ? Number(declaracion.PAGO_A_CUENTA_RENTA)
            : null
          : datos.pagoACuentaRenta
        : null;
    const saldoRentaFinal =
      datos.tipoDeclaracion === "DJ_ANUAL_RENTA"
        ? datosYaCargados
          ? declaracion.SALDO_RENTA !== null
            ? Number(declaracion.SALDO_RENTA)
            : null
          : datos.saldoRenta
        : null;

    const { avisoSinCuenta } = await presentarDeclaracionConCredito(
      {
        idDeclaracion: id_declaracion,
        tipoDeclaracionCodigo: datos.tipoDeclaracion,
        mes,
        anio: datos.anio,
        igvResultante: igvResultanteFinal,
        pagoACuentaRenta: pagoACuentaRentaFinal,
        saldoRenta: saldoRentaFinal,
        // La fecha real de SUNAT (no el dia en que se sube el archivo) --
        // si la IA no pudo leerla, se avisa y queda la fecha de hoy
        // (COALESCE en el SP), igual que el boton manual.
        fechaPresentacion: datos.fechaPresentacion,
      },
      sesion.idUsuario,
    );
    if (!datos.fechaPresentacion) {
      advertencias.push("No se encontro la fecha de presentacion en la constancia -- se uso la fecha de hoy, verificala y corrigela si hace falta.");
    }
    if (avisoSinCuenta) advertencias.push(avisoSinCuenta);
    revalidatePath("/facturacion/cuentas");
  } else if (existiaAntes) {
    advertencias.push("Esta declaracion ya no estaba en borrador (presentada, pagada o anulada) -- no se modifico, solo se adjunto el documento.");
  }

  const ruta = `impuestos/declaraciones/${id_declaracion}/constancia-${Date.now()}.${tipoArchivo.extension}`;
  await guardarArchivo(ruta, bytesArchivo);
  await subirDocumentoDeclaracion(id_declaracion, ruta, sesion.idUsuario);

  revalidatePath(`/facturacion/impuestos/${id_declaracion}`);
  revalidatePath("/facturacion/impuestos");

  const periodoTexto = mes === 0 ? `${datos.anio}` : `${MESES[mes - 1]} ${datos.anio}`;

  return NextResponse.json({
    ok: true,
    idDeclaracion: id_declaracion,
    descripcion: `${tipo.DESCRIPCION} -- ${periodoTexto}`,
    advertencias,
  });
}
