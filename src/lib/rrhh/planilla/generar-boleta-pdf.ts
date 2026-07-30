import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR, formatearMoneda, formatearFechaCorta } from "@/lib/rrhh/plantilla-tokens";
import { montoEnLetras } from "@/lib/rrhh/numero-a-letras";
import { formatearNroBoleta } from "./tokens";

export interface DatosBoletaPdf {
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
  sistemaPensionDescripcion: string | null;
  afpFondoDescripcion: string | null;
  bruto: number;
  aportePension: number;
  retencionRenta: number;
  essalud: number;
  neto: number;
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
}

// Boleta de pago (5ta categoria, PLANILLA_FULLTIME/PARTTIME). El EsSalud
// se muestra como nota informativa (costo del empleador) -- no aparece
// en la columna de descuentos ni resta el neto.
export async function generarBoletaPdf(datos: DatosBoletaPdf): Promise<Uint8Array> {
  const nroBoleta = formatearNroBoleta(datos.idPlanillaDetalle, datos.anio);
  const nombreCompleto = `${datos.nombres} ${datos.apellidos}`;

  const writer = await PdfWriter.crear({
    logoBytes: datos.logoBytes,
    logoFormato: datos.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: nroBoleta,
  });

  writer.titulo("BOLETA DE PAGO");
  writer.parrafo(`Periodo: ${datos.periodo}\nFecha de emision: ${formatearFechaCorta(new Date().toISOString().slice(0, 10))}`);

  writer.subtitulo("Datos del colaborador");
  writer.parrafo(
    [
      `| Colaborador | ${nombreCompleto} |`,
      `| ${datos.tipoDocumentoDescripcion ?? "DNI"} | ${datos.nroDocumento ?? "-"} |`,
      `| Cargo | ${datos.cargo} |`,
      `| Cuenta de pago | ${datos.nroCuenta ?? "-"} |`,
      `| CCI | ${datos.cci ?? "-"} |`,
      `| Banco | ${datos.banco ?? "-"} |`,
      `| Sistema de pension | ${datos.sistemaPensionDescripcion ?? "-"}${datos.afpFondoDescripcion ? ` (${datos.afpFondoDescripcion})` : ""} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("Detalle");
  writer.parrafo(
    [
      "| Concepto | Monto |",
      `| Ingreso bruto | ${formatearMoneda(datos.bruto)} |`,
      `| (-) Aporte de pension | ${formatearMoneda(datos.aportePension)} |`,
      `| (-) Retencion Renta de 5ta categoria | ${formatearMoneda(datos.retencionRenta)} |`,
      `| NETO A PAGAR | ${formatearMoneda(datos.neto)} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.parrafo(`Son: ${montoEnLetras(datos.neto)}`, { negrita: true, justificar: false });
  writer.espacio(4);
  writer.parrafo(
    `Nota: el aporte a EsSalud (${formatearMoneda(datos.essalud)}) es un costo asumido por el empleador y no forma parte de los descuentos del colaborador ni afecta el neto a pagar.`,
    { tamano: 8.5, justificar: false },
  );

  return writer.bytes();
}
