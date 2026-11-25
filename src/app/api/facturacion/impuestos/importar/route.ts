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
import { guardarArchivo } from "@/lib/storage/local-storage";

const IMPUESTOS_APP_CODIGO = "IMPUESTOS_EMPRESA";

const TAMANO_MAX_BYTES = 15 * 1024 * 1024;
const TIPOS_PERMITIDOS: Record<string, { mime: "application/pdf" | "image/png" | "image/jpeg"; extension: string }> = {
  "application/pdf": { mime: "application/pdf", extension: "pdf" },
  "image/png": { mime: "image/png", extension: "png" },
  "image/jpeg": { mime: "image/jpeg", extension: "jpg" },
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

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
// BORRADOR y todavia no tenia montos cargados, los completa con lo
// extraido -- nunca sobrescribe datos ya cargados ni una declaracion que
// ya avanzo de estado, 4) adjunta el archivo original como constancia.
// Si la IA no logra identificar tipo+periodo con confianza, no crea nada
// -- el archivo queda para subir a mano desde "Nueva declaracion".
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

  if (declaracion.ESTADO_DECLARACION_CODIGO === "BORRADOR" && !datosYaCargados) {
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
      montoTotalAPagar: datos.montoTotalAPagar ?? 0,
      notas: declaracion.NOTAS,
      idUsuarioModificacion: sesion.idUsuario,
    });
  } else if (existiaAntes) {
    advertencias.push("Esta declaracion ya tenia datos cargados o ya no esta en borrador -- no se sobrescribieron, solo se adjunto el documento.");
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
