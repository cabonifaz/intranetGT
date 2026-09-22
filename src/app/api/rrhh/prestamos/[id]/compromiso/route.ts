import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { obtenerPrestamo, listarCuotasPrestamo } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { generarCompromisoPrestamoPdf } from "@/lib/rrhh/planilla/generar-compromiso-prestamo-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";

// Se genera al vuelo con el cronograma vigente (no se persiste) -- lo que
// se guarda es el compromiso FIRMADO que sube RRHH, ver
// subirCompromisoFirmadoAction. Ademas de quien tiene LECTURA sobre
// RRHH_PLANILLA, el propio beneficiario puede descargarlo -- lo necesita
// para firmarlo (ver [id]/page.tsx).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSession();
  const { id } = await params;
  const idPrestamo = Number(id);
  const [prestamo, cuotas, logo, permisos] = await Promise.all([
    obtenerPrestamo(idPrestamo),
    listarCuotasPrestamo(idPrestamo),
    cargarLogoEmpresa(),
    obtenerPermisosUsuario(sesion.idUsuario),
  ]);
  if (!prestamo) {
    return NextResponse.json({ error: "Prestamo no encontrado." }, { status: 404 });
  }
  if (!tienePermiso(permisos, "RRHH_PLANILLA", "LECTURA") && prestamo.ID_USUARIO !== sesion.idUsuario) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const bytes = await generarCompromisoPrestamoPdf({ prestamo, cuotas, logoBytes: logo.logoBytes, logoFormato: logo.logoFormato });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="compromiso-prestamo-${idPrestamo}.pdf"`,
    },
  });
}
