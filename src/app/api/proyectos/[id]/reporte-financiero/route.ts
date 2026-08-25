import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerProyecto, listarHitosProyecto, listarIngresosProyecto } from "@/lib/db/repositories/proyecto.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import { calcularCosteo } from "@/lib/proyectos/costeo";
import { calcularImpuestosProyecto } from "@/lib/proyectos/impuestos";
import { generarReporteFinancieroProyectoPdf } from "@/lib/proyectos/generar-reporte-financiero-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";

// Se regenera al vuelo en cada descarga (no se persiste) -- es un
// agregado de solo lectura sobre numeros ya calculados en Costeo, mismo
// criterio que el resumen de Planilla Mensual y el plan de pagos de
// Pasivos. ?tipo=detallado agrega desglose de costo, plan de facturacion,
// ingresos e IGV/detraccion referencial -- por defecto (o ?tipo=resumen)
// solo trae el resumen financiero.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("PROYECTOS_EMPRESA", "LECTURA");

  const { id } = await params;
  const idProyecto = Number(id);
  const detallado = new URL(request.url).searchParams.get("tipo") === "detallado";

  const [proyecto, logo] = await Promise.all([obtenerProyecto(idProyecto), cargarLogoEmpresa()]);
  if (!proyecto) {
    return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  }

  const costeo = calcularCosteo(proyecto);

  let extra: Partial<Parameters<typeof generarReporteFinancieroProyectoPdf>[0]> = {};
  if (detallado) {
    const [hitos, ingresos, tcVenta] = await Promise.all([
      listarHitosProyecto(idProyecto),
      listarIngresosProyecto(idProyecto),
      obtenerTipoCambioVigente("VENTA"),
    ]);
    const impuestos = calcularImpuestosProyecto(hitos, proyecto.MONEDA_CODIGO, tcVenta ? Number(tcVenta) : null);

    extra = {
      desgloseCosto: {
        compras: { comprometido: Number(proyecto.COSTO_COMPRAS), pagado: Number(proyecto.COSTO_COMPRAS_PAGADO) },
        manoObraHoras: { comprometido: Number(proyecto.COSTO_MANO_OBRA_HORAS), pagado: Number(proyecto.COSTO_MANO_OBRA_HORAS_PAGADO) },
        manoObraManual: { comprometido: Number(proyecto.COSTO_MANO_OBRA_MANUAL), pagado: Number(proyecto.COSTO_MANO_OBRA_MANUAL_PAGADO) },
        manoObraTarifaUnica: { comprometido: Number(proyecto.COSTO_MANO_OBRA_TARIFA_UNICA), pagado: Number(proyecto.COSTO_MANO_OBRA_TARIFA_UNICA_PAGADO) },
        pagosRecurrentes: { comprometido: Number(proyecto.COSTO_PAGOS_RECURRENTES), pagado: Number(proyecto.COSTO_PAGOS_RECURRENTES_PAGADO) },
      },
      hitos: hitos.map((h) => ({
        nombre: h.NOMBRE,
        tipo: h.TIPO_HITO_DESCRIPCION,
        monto: Number(h.MONTO),
        estado: h.ESTADO_HITO_DESCRIPCION,
        fechaEstimada: h.FECHA_ESTIMADA,
      })),
      ingresos: ingresos.map((i) => ({ fecha: i.FECHA, concepto: i.CONCEPTO, monto: Number(i.MONTO) })),
      igvPorDeclarar: impuestos.igvPorDeclarar,
      detraccionPendienteSoles: impuestos.detraccionPendienteSoles,
    };
  }

  const pdfBytes = await generarReporteFinancieroProyectoPdf(
    {
      nombreProyecto: proyecto.NOMBRE,
      clienteRazonSocial: proyecto.CLIENTE_RAZON_SOCIAL,
      esInterno: Boolean(proyecto.ES_INTERNO),
      monedaCodigo: proyecto.MONEDA_CODIGO,
      fechaInicio: proyecto.FECHA_INICIO,
      fechaFinEstimada: proyecto.FECHA_FIN_ESTIMADA,
      estadoProyectoDescripcion: proyecto.ESTADO_PROYECTO_DESCRIPCION,
      costoPresupuestado: costeo.costoPresupuestado,
      ingresoEsperado: costeo.ingresoEsperado,
      costoReal: costeo.costoReal,
      montoFacturado: costeo.montoFacturado,
      ingresoReal: costeo.ingresoReal,
      margenActual: costeo.margenActual,
      margenAlCierre: costeo.margenAlCierre,
      margenFacturado: costeo.margenFacturado,
      logoBytes: logo.logoBytes,
      logoFormato: logo.logoFormato,
      ...extra,
    },
    detallado,
  );

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="reporte-financiero-${detallado ? "detallado" : "resumen"}-${idProyecto}.pdf"`,
    },
  });
}
