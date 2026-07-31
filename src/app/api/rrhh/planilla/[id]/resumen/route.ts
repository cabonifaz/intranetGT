import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPlanillaMensual, listarDetalle } from "@/lib/db/repositories/rrhh-planilla.repository";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { generarResumenPlanillaPdf } from "@/lib/rrhh/planilla/generar-resumen-planilla-pdf";

function etiquetaRegimen(tipoContratoCodigo: string, tipoPagoLocadorDescripcion: string | null): string {
  return tipoContratoCodigo === "LOCADOR" ? `Locador (${tipoPagoLocadorDescripcion ?? "-"})` : "Planilla";
}

// Agregado de solo lectura -- se regenera cada vez que se pide, no se
// persiste (ver generar-resumen-planilla-pdf.ts).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");

  const { id } = await params;
  const idPlanilla = Number(id);

  const [planilla, filas, logo] = await Promise.all([
    obtenerPlanillaMensual(idPlanilla),
    listarDetalle(idPlanilla),
    cargarLogoEmpresa(),
  ]);

  if (!planilla) {
    return NextResponse.json({ error: "Planilla no encontrada." }, { status: 404 });
  }

  const pdfBytes = await generarResumenPlanillaPdf({
    periodo: planilla.PERIODO,
    logoBytes: logo.logoBytes,
    logoFormato: logo.logoFormato,
    filas: filas.map((f) => ({
      nombreCompleto: `${f.NOMBRES} ${f.APELLIDOS}`,
      regimen: etiquetaRegimen(f.TIPO_CONTRATO_CODIGO, f.TIPO_PAGO_LOCADOR_DESCRIPCION),
      bruto: Number(f.MONTO_BRUTO),
      descuentos: Number(f.MONTO_BRUTO) - Number(f.MONTO_NETO),
      neto: Number(f.MONTO_NETO),
      estadoEmision: f.ESTADO_EMISION_DESCRIPCION,
    })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resumen-planilla-${planilla.ANIO}-${String(planilla.MES).padStart(2, "0")}.pdf"`,
    },
  });
}
