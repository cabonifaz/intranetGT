import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { obtenerPrestamo } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

// Ademas de quien tiene LECTURA sobre RRHH_PLANILLA, el propio
// beneficiario puede ver su compromiso ya firmado.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSession();
  const { id } = await params;
  const [prestamo, permisos] = await Promise.all([obtenerPrestamo(Number(id)), obtenerPermisosUsuario(sesion.idUsuario)]);
  if (!prestamo?.DOCUMENTO_FIRMADO_PATH) {
    return NextResponse.json({ error: "Compromiso firmado no disponible." }, { status: 404 });
  }
  if (!tienePermiso(permisos, "RRHH_PLANILLA", "LECTURA") && prestamo.ID_USUARIO !== sesion.idUsuario) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const extension = prestamo.DOCUMENTO_FIRMADO_PATH.split(".").pop() ?? "pdf";
  const archivo = await leerArchivo(prestamo.DOCUMENTO_FIRMADO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": CONTENT_TYPE_POR_EXTENSION[extension] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="compromiso-firmado-prestamo-${prestamo.ID_PRESTAMO}.${extension}"`,
    },
  });
}
