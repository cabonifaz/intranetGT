import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { obtenerDetalle } from "@/lib/db/repositories/rrhh-planilla.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

// Ademas de quien tiene LECTURA sobre RRHH_PLANILLA, el propio
// colaborador puede descargar su boleta/RxH.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSession();
  const { id } = await params;
  const [detalle, permisos] = await Promise.all([obtenerDetalle(Number(id)), obtenerPermisosUsuario(sesion.idUsuario)]);

  if (!detalle?.DOCUMENTO_PATH) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }
  if (!tienePermiso(permisos, "RRHH_PLANILLA", "LECTURA") && detalle.ID_USUARIO !== sesion.idUsuario) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const archivo = await leerArchivo(detalle.DOCUMENTO_PATH);
  const prefijo = detalle.TIPO_CONTRATO_CODIGO === "LOCADOR" ? "orden-servicio" : "boleta";

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${prefijo}-${detalle.ID_PLANILLA_DETALLE}.pdf"`,
    },
  });
}
