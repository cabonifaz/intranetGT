import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR, formatearFechaCorta, formatearFechaLarga } from "@/lib/rrhh/plantilla-tokens";
import { montoEnLetras } from "@/lib/rrhh/numero-a-letras";
import { etiquetaPeriodoMensual } from "@/lib/rrhh/periodos-pago";
import type { PrestamoRow, PrestamoCuotaRow } from "@/types/db";

// Compromiso de pago y autorizacion de descuento de un prestamo a un
// colaborador: un documento con todo el detalle del prestamo y su
// cronograma de descuentos, que el colaborador firma (se imprime, se
// firma y se sube firmado desde el detalle del prestamo). Se genera al
// vuelo con el cronograma vigente -- si el cronograma cambia despues de
// firmar, se vuelve a generar para una nueva firma.
//
// Las clausulas son un modelo base: conviene que el area legal las revise
// antes de usarlo con casos reales.

export function formatearNroPrestamo(idPrestamo: number, fechaIso: string, tipoCodigo: string = "PRESTAMO"): string {
  return `${tipoCodigo === "ADELANTO_SUELDO" ? "ADE" : "PRE"}#${fechaIso.slice(0, 4)}-${String(idPrestamo).padStart(4, "0")}`;
}

function moneda(monto: number, codigo: string): string {
  const simbolo = codigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface DatosCompromisoPrestamoPdf {
  prestamo: PrestamoRow;
  cuotas: PrestamoCuotaRow[];
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
}

export async function generarCompromisoPrestamoPdf(datos: DatosCompromisoPrestamoPdf): Promise<Uint8Array> {
  const { prestamo, cuotas } = datos;
  const cod = prestamo.MONEDA_CODIGO;
  const enSoles = cod === "PEN";
  const tc = prestamo.TIPO_CAMBIO ? Number(prestamo.TIPO_CAMBIO) : null;
  const nombreColaborador = `${prestamo.NOMBRES} ${prestamo.APELLIDOS}`;
  const monedaLetras = enSoles ? "Soles" : "Dolares americanos";
  const cuotasVigentes = cuotas.filter((c) => c.ESTADO_CUOTA_CODIGO !== "ANULADA");
  const totalCuotas = cuotasVigentes.reduce((suma, c) => suma + Number(c.MONTO), 0);
  const esAdelanto = prestamo.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO";
  const nombreTipo = esAdelanto ? "adelanto de sueldo" : "préstamo";
  const nroPrestamo = formatearNroPrestamo(prestamo.ID_PRESTAMO, prestamo.FECHA_ORIGEN, prestamo.TIPO_PRESTAMO_CODIGO);

  const writer = await PdfWriter.crear({
    logoBytes: datos.logoBytes,
    logoFormato: datos.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: nroPrestamo,
  });

  writer.titulo(esAdelanto ? "SOLICITUD DE ADELANTO DE SUELDO Y AUTORIZACION DE DESCUENTO" : "COMPROMISO DE PAGO Y AUTORIZACION DE DESCUENTO");

  writer.parrafo(
    `Conste por el presente documento que ${EMPLEADOR.razonSocial}, con RUC N° ${EMPLEADOR.ruc}, con domicilio en ${EMPLEADOR.domicilio}, ` +
      `representada por ${EMPLEADOR.representanteNombre}, identificado con DNI N° ${EMPLEADOR.representanteDni}, en adelante EL EMPLEADOR, ` +
      `otorga un ${nombreTipo}${esAdelanto ? " a cuenta de su remuneración o contraprestación" : ""} a ${nombreColaborador}, identificado con ${prestamo.TIPO_DOCUMENTO_DESCRIPCION ?? "DNI"} N° ${prestamo.NRO_DOCUMENTO ?? "-"}` +
      `${prestamo.PUESTO ? `, en el puesto de ${prestamo.PUESTO}` : ""}${prestamo.DIRECCION ? `, con domicilio en ${prestamo.DIRECCION}` : ""}, ` +
      `en adelante EL COLABORADOR, bajo los términos y condiciones siguientes:`,
  );

  writer.subtitulo(esAdelanto ? "Datos del adelanto" : "Datos del préstamo");
  const filasDatos = [
    `| ${esAdelanto ? "Adelanto" : "Préstamo"} N° | ${nroPrestamo} |`,
    `| Fecha de otorgamiento | ${formatearFechaCorta(prestamo.FECHA_ORIGEN)} |`,
    `| Monto del ${nombreTipo} | ${moneda(Number(prestamo.MONTO_TOTAL), cod)} |`,
    `| Son | ${montoEnLetras(Number(prestamo.MONTO_TOTAL), monedaLetras)} |`,
    `| Moneda | ${prestamo.MONEDA_DESCRIPCION} |`,
  ];
  if (!enSoles && tc) filasDatos.push(`| Tipo de cambio pactado | S/ ${tc.toFixed(4)} por US$ 1.00 |`);
  if (prestamo.DESCRIPCION) filasDatos.push(`| Motivo | ${prestamo.DESCRIPCION} |`);
  if (prestamo.CUENTA_DESEMBOLSO_NOMBRE) filasDatos.push(`| Desembolsado desde | ${prestamo.CUENTA_DESEMBOLSO_NOMBRE} |`);
  filasDatos.push(`| Número de cuotas | ${cuotasVigentes.length} |`);
  writer.parrafo(filasDatos.join("\n"), { justificar: false });

  writer.subtitulo("Cronograma de pagos (descuentos)");
  const encabezado = enSoles ? "| N° | Periodo de descuento | Cuota |" : "| N° | Periodo de descuento | Cuota | Equivalente en soles |";
  const filasCronograma = cuotasVigentes.map((c, i) => {
    const monto = Number(c.MONTO);
    const periodo = etiquetaPeriodoMensual(c.ANIO, c.MES - 1);
    return enSoles
      ? `| ${i + 1} | ${periodo} | ${moneda(monto, cod)} |`
      : `| ${i + 1} | ${periodo} | ${moneda(monto, cod)} | ${tc ? moneda(Math.round(monto * tc * 100) / 100, "PEN") : "-"} |`;
  });
  const filaTotal = enSoles
    ? `| | TOTAL | ${moneda(totalCuotas, cod)} |`
    : `| | TOTAL | ${moneda(totalCuotas, cod)} | ${tc ? moneda(Math.round(totalCuotas * tc * 100) / 100, "PEN") : "-"} |`;
  writer.parrafo([encabezado, ...filasCronograma, filaTotal].join("\n"), { justificar: false });

  writer.subtitulo("Cláusulas");
  const clausulas: string[] = [
    esAdelanto
      ? `PRIMERA - OBJETO: EL COLABORADOR solicita y EL EMPLEADOR le entrega la suma de ${moneda(Number(prestamo.MONTO_TOTAL), cod)} (${montoEnLetras(Number(prestamo.MONTO_TOTAL), monedaLetras)}) como adelanto a cuenta de su remuneración o contraprestación, que se compensará íntegramente con los descuentos del cronograma indicado en este documento.`
      : `PRIMERA - OBJETO: EL EMPLEADOR entrega a EL COLABORADOR la suma de ${moneda(Number(prestamo.MONTO_TOTAL), cod)} (${montoEnLetras(Number(prestamo.MONTO_TOTAL), monedaLetras)}) a título de préstamo, y EL COLABORADOR se obliga a devolverla íntegramente en las cuotas y fechas del cronograma de pagos indicado en este documento.`,
    "SEGUNDA - FORMA DE PAGO: EL COLABORADOR autoriza expresamente a EL EMPLEADOR a descontar cada cuota del cronograma de su remuneración mensual (o de sus honorarios, según su régimen de contratación) en el periodo indicado, y a reflejar el descuento en su boleta de pago o recibo por honorarios.",
    "TERCERA - CUOTAS EXTRAORDINARIAS: El cronograma puede incluir cuotas con cargo a las gratificaciones de julio y diciembre u otros ingresos extraordinarios. EL COLABORADOR autoriza el descuento de esas cuotas en el periodo en que se abonen dichos ingresos.",
    enSoles
      ? `CUARTA - MONEDA: El ${nombreTipo} y sus cuotas están expresados en soles.`
      : `CUARTA - MONEDA Y TIPO DE CAMBIO: El ${nombreTipo} y sus cuotas están expresados en dólares americanos. Cada cuota se descontará en soles al tipo de cambio pactado de S/ ${tc ? tc.toFixed(4) : "-"} por US$ 1.00, sin variación durante la vigencia del ${nombreTipo}.`,
    `QUINTA - INTERESES: El ${nombreTipo} no devenga intereses ni comisiones.`,
    "SEXTA - MODIFICACIONES: El cronograma solo puede modificarse por acuerdo escrito entre las partes (por ejemplo, para reprogramar o agregar cuotas). Todo cronograma modificado se documenta con un nuevo compromiso firmado.",
    `SETIMA - TERMINACION DE LA RELACION: Si la relación con EL EMPLEADOR termina antes de cancelar el ${nombreTipo}, el saldo pendiente será exigible y EL COLABORADOR autoriza que se descuente de su liquidación de beneficios sociales u otros conceptos pendientes de pago, en la medida permitida por la ley.`,
    "OCTAVA - CONFORMIDAD: Las partes declaran conocer y aceptar el contenido de este documento y lo suscriben en señal de conformidad.",
  ];
  for (const clausula of clausulas) {
    writer.parrafo(clausula);
    writer.espacio(2);
  }

  writer.espacio(6);
  writer.parrafo(`Lima, ${formatearFechaLarga(prestamo.FECHA_ORIGEN)}.`, { justificar: false });
  writer.espacio(14);

  await writer.firmasEnColumnas(
    { nombre: EMPLEADOR.representanteNombre, rol: `EL EMPLEADOR - ${EMPLEADOR.razonSocial}`, firmaPngBytes: null },
    { nombre: nombreColaborador, rol: `EL COLABORADOR - ${prestamo.TIPO_DOCUMENTO_DESCRIPCION ?? "DNI"} ${prestamo.NRO_DOCUMENTO ?? ""}`.trim(), firmaPngBytes: null },
  );

  return writer.bytes();
}
