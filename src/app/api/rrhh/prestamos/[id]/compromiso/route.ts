import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPrestamo, listarCuotasPrestamo } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { generarCompromisoPrestamoPdf } from "@/lib/rrhh/planilla/generar-compromiso-prestamo-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";

// Se genera al vuelo con el cronograma vigente (no se persiste) -- lo que
// se guarda es el compromiso FIRMADO que sube RRHH, ver
// subirCompromisoFirmadoAction.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");

  const { id } = await params;
  const idPrestamo = Number(id);
  const [prestamo, cuotas, logo] = await Promise.all([obtenerPrestamo(idPrestamo), listarCuotasPrestamo(idPrestamo), cargarLogoEmpresa()]);
  if (!prestamo) {
    return NextResponse.json({ error: "Prestamo no encontrado." }, { status: 404 });
  }

  const bytes = await generarCompromisoPrestamoPdf({ prestamo, cuotas, logoBytes: logo.logoBytes, logoFormato: logo.logoFormato });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="compromiso-prestamo-${idPrestamo}.pdf"`,
    },
  });
}
