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

// Orden de servicio (4ta categoria, LOCADOR cualquier regimen) -- NO es
// el Recibo por Honorarios en si: por ley, el RxH lo emite el propio
// locador ante SUNAT, no la empresa. Este documento autoriza/detalla el
// pago para que el locador emita su RxH por ese monto y lo entregue
// firmado (ver seccion "RxH firmado y evidencia de pago" en el detalle).
export async function generarReciboHonorariosPdf(datos: DatosReciboHonorariosPdf): Promise<Uint8Array> {
  const nroOrden = formatearNroRxH(datos.idPlanillaDetalle, datos.anio);
  const nombreCompleto = `${datos.nombres} ${datos.apellidos}`;

  const writer = await PdfWriter.crear({
    logoBytes: datos.logoBytes,
    logoFormato: datos.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: nroOrden,
  });

  writer.titulo("ORDEN DE SERVICIO");
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

  writer.parrafo(
    "Esta orden autoriza y detalla el pago del servicio prestado. El locador debe emitir su Recibo por Honorarios (RxH) " +
      "ante SUNAT por el monto bruto indicado y entregarlo firmado junto con la evidencia de pago.",
    { justificar: false },
  );

  return writer.bytes();
}
