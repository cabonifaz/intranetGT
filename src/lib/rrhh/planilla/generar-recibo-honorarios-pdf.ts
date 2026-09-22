import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR, formatearMoneda, formatearFechaCorta } from "@/lib/rrhh/plantilla-tokens";
import { montoEnLetras } from "@/lib/rrhh/numero-a-letras";
import { formatearNroRxH } from "./tokens";

export interface DatosReciboHonorariosPdf {
  idPlanillaDetalle: number;
  periodo: string;
  anio: number;
  nombres: string;
  apellidos: string;
  cargo: string;
  tipoDocumentoDescripcion: string | null;
  nroDocumento: string | null;
  nroCuenta: string | null;
  cci: string | null;
  banco: string | null;
  tieneSuspension: boolean;
  suspensionHasta: string | null;
  bruto: number;
  retencionRenta: number;
  descuentoPrestamo: number;
  descuentosPrestamo: { descripcion: string; monto: number }[];
  neto: number;
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
}

// Recibo por honorarios (4ta categoria, LOCADOR cualquier regimen).
export async function generarReciboHonorariosPdf(datos: DatosReciboHonorariosPdf): Promise<Uint8Array> {
  const nroRxH = formatearNroRxH(datos.idPlanillaDetalle, datos.anio);
  const nombreCompleto = `${datos.nombres} ${datos.apellidos}`;

  const writer = await PdfWriter.crear({
    logoBytes: datos.logoBytes,
    logoFormato: datos.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: nroRxH,
  });

  writer.titulo("RECIBO POR HONORARIOS");
  writer.parrafo(`Periodo: ${datos.periodo}\nFecha de emision: ${formatearFechaCorta(new Date().toISOString().slice(0, 10))}`);

  writer.subtitulo("Datos del locador");
  writer.parrafo(
    [
      `| Locador | ${nombreCompleto} |`,
      `| ${datos.tipoDocumentoDescripcion ?? "DNI"} | ${datos.nroDocumento ?? "-"} |`,
      `| Servicio | ${datos.cargo} |`,
      `| Cuenta de pago | ${datos.nroCuenta ?? "-"} |`,
      `| CCI | ${datos.cci ?? "-"} |`,
      `| Banco | ${datos.banco ?? "-"} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("Detalle");
  const filaRetencion = datos.tieneSuspension
    ? `| Retencion Renta de 4ta categoria | Suspendida (vigente hasta ${datos.suspensionHasta ? formatearFechaCorta(datos.suspensionHasta) : "-"}) |`
    : `| (-) Retencion Renta de 4ta categoria | ${formatearMoneda(datos.retencionRenta)} |`;
  const filasPrestamo = datos.descuentosPrestamo.map((c) => `| (-) ${c.descripcion} | ${formatearMoneda(c.monto)} |`);
  const ajustePrestamo = Math.round((datos.descuentoPrestamo - datos.descuentosPrestamo.reduce((s, c) => s + c.monto, 0)) * 100) / 100;
  if (Math.abs(ajustePrestamo) >= 0.01) filasPrestamo.push(`| (-) Ajuste descuento de prestamo | ${formatearMoneda(ajustePrestamo)} |`);
  writer.parrafo(
    [
      "| Concepto | Monto |",
      `| Monto bruto del recibo | ${formatearMoneda(datos.bruto)} |`,
      filaRetencion,
      ...filasPrestamo,
      `| NETO A PAGAR | ${formatearMoneda(datos.neto)} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.parrafo(`Son: ${montoEnLetras(datos.neto)}`, { negrita: true, justificar: false });

  return writer.bytes();
}
