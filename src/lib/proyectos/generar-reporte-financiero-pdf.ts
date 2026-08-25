import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR, formatearMoneda, formatearFechaCorta } from "@/lib/rrhh/plantilla-tokens";

// Reporte financiero de un proyecto, en dos variantes que comparten el
// mismo cuerpo de cabecera/resumen -- "detallado" solo agrega las
// secciones de desglose de costo, plan de facturacion, ingresos e IGV/
// detraccion (los campos opcionales quedan undefined en la variante
// resumen, el llamador solo los arma si corresponde). Reusa PdfWriter/
// cargarLogoEmpresa/EMPLEADOR igual que el resto de PDFs del sistema --
// mismo logo y color de marca que ya usan contratos, boletas y el plan
// de pagos de Pasivos.
export interface DesgloseCostoItem {
  comprometido: number;
  pagado: number;
}

export interface HitoReporte {
  nombre: string;
  tipo: string;
  monto: number;
  estado: string;
  fechaEstimada: string | null;
}

export interface IngresoReporte {
  fecha: string;
  concepto: string;
  monto: number;
}

export interface DatosReporteFinancieroProyecto {
  nombreProyecto: string;
  clienteRazonSocial: string | null;
  esInterno: boolean;
  monedaCodigo: string;
  fechaInicio: string;
  fechaFinEstimada: string | null;
  estadoProyectoDescripcion: string;

  costoPresupuestado: number;
  ingresoEsperado: number;
  costoReal: number;
  montoFacturado: number;
  ingresoReal: number;
  margenActual: number;
  margenAlCierre: number;
  margenFacturado: number;

  desgloseCosto?: {
    compras: DesgloseCostoItem;
    manoObraHoras: DesgloseCostoItem;
    manoObraManual: DesgloseCostoItem;
    manoObraTarifaUnica: DesgloseCostoItem;
    pagosRecurrentes: DesgloseCostoItem;
  };
  hitos?: HitoReporte[];
  ingresos?: IngresoReporte[];
  igvPorDeclarar?: number;
  detraccionPendienteSoles?: number;

  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
}

function moneda(monto: number, monedaCodigo: string): string {
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  const signo = monto < 0 ? "-" : "";
  return `${signo}${simbolo} ${Math.abs(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generarReporteFinancieroProyectoPdf(datos: DatosReporteFinancieroProyecto, detallado: boolean): Promise<Uint8Array> {
  const m = datos.monedaCodigo;
  const nroReporte = `RF#${new Date().getFullYear()}-${detallado ? "DET" : "RES"}`;

  const writer = await PdfWriter.crear({
    logoBytes: datos.logoBytes,
    logoFormato: datos.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: nroReporte,
  });

  writer.titulo(detallado ? "REPORTE FINANCIERO DETALLADO" : "REPORTE FINANCIERO -- RESUMEN");

  writer.subtitulo(datos.nombreProyecto);
  writer.parrafo(
    [
      `| Cliente | ${datos.esInterno ? "Proyecto interno (GT)" : (datos.clienteRazonSocial ?? "-")} |`,
      `| Estado | ${datos.estadoProyectoDescripcion} |`,
      `| Inicio | ${formatearFechaCorta(datos.fechaInicio)} |`,
      `| Fin estimado | ${datos.fechaFinEstimada ? formatearFechaCorta(datos.fechaFinEstimada) : "-"} |`,
      `| Moneda | ${m} |`,
      `| Generado | ${formatearFechaCorta(new Date().toISOString().slice(0, 10))} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("Resumen financiero");
  writer.parrafo(
    [
      "| Concepto | Presupuestado/Esperado | Real a la fecha |",
      `| Costo | ${moneda(datos.costoPresupuestado, m)} | ${moneda(datos.costoReal, m)} |`,
      `| Ingreso | ${moneda(datos.ingresoEsperado, m)} | Facturado: ${moneda(datos.montoFacturado, m)} / Cobrado: ${moneda(datos.ingresoReal, m)} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.parrafo(
    [
      "| Margen | Monto |",
      `| Margen actual (Cobrado - Costo real) | ${moneda(datos.margenActual, m)} |`,
      `| Margen devengado (Facturado - Costo real) | ${moneda(datos.margenFacturado, m)} |`,
      `| Margen al cierre (Ingreso esperado - Costo presupuestado) | ${moneda(datos.margenAlCierre, m)} |`,
    ].join("\n"),
    { justificar: false },
  );

  if (!detallado) {
    return writer.bytes();
  }

  if (datos.desgloseCosto) {
    writer.subtitulo("Desglose de costo (comprometido / pagado)");
    const d = datos.desgloseCosto;
    writer.parrafo(
      [
        "| Categoria | Comprometido | Pagado |",
        `| Compras | ${moneda(d.compras.comprometido, m)} | ${moneda(d.compras.pagado, m)} |`,
        `| Mano de obra por horas | ${moneda(d.manoObraHoras.comprometido, m)} | ${moneda(d.manoObraHoras.pagado, m)} |`,
        `| Mano de obra manual | ${moneda(d.manoObraManual.comprometido, m)} | ${moneda(d.manoObraManual.pagado, m)} |`,
        `| Mano de obra tarifa unica | ${moneda(d.manoObraTarifaUnica.comprometido, m)} | ${moneda(d.manoObraTarifaUnica.pagado, m)} |`,
        `| Pagos recurrentes | ${moneda(d.pagosRecurrentes.comprometido, m)} | ${moneda(d.pagosRecurrentes.pagado, m)} |`,
      ].join("\n"),
      { justificar: false },
    );
  }

  if (datos.hitos && datos.hitos.length > 0) {
    writer.subtitulo("Plan de facturacion");
    const filas = datos.hitos.map(
      (h) => `| ${h.nombre} | ${h.tipo} | ${moneda(h.monto, m)} | ${h.estado} | ${h.fechaEstimada ? formatearFechaCorta(h.fechaEstimada) : "-"} |`,
    );
    writer.parrafo(["| Item | Tipo | Monto | Estado | Fecha estimada |", ...filas].join("\n"), { justificar: false });
  }

  if (datos.ingresos && datos.ingresos.length > 0) {
    writer.subtitulo("Ingresos registrados");
    const filas = datos.ingresos.map((i) => `| ${formatearFechaCorta(i.fecha)} | ${i.concepto} | ${moneda(i.monto, m)} |`);
    writer.parrafo(["| Fecha | Concepto | Monto |", ...filas].join("\n"), { justificar: false });
  }

  if (datos.igvPorDeclarar !== undefined || datos.detraccionPendienteSoles !== undefined) {
    writer.subtitulo("Tributario (referencial)");
    writer.parrafo(
      [
        "| Concepto | Monto |",
        `| IGV por declarar a SUNAT | ${moneda(datos.igvPorDeclarar ?? 0, m)} |`,
        `| Detraccion pendiente de deposito | ${formatearMoneda(datos.detraccionPendienteSoles ?? 0)} (siempre en soles) |`,
      ].join("\n"),
      { justificar: false },
    );
    writer.parrafo("El IGV/detraccion son de referencia -- se calculan al vuelo, no se persisten en ningun lado.", { tamano: 8.5, justificar: false });
  }

  return writer.bytes();
}
