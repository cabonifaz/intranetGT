import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerEmpleado } from "@/lib/db/repositories/rrhh-empleado.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

export async function GET(_request: Request, { params }: { params: Promise<{ idUsuario: string }> }) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");

  const { idUsuario } = await params;
  const empleado = await obtenerEmpleado(Number(idUsuario));

  if (!empleado?.SUSPENSION_RETENCION_4TA_PATH) {
    return NextResponse.json({ error: "Constancia de suspensión no disponible." }, { status: 404 });
  }

  const extension = empleado.SUSPENSION_RETENCION_4TA_PATH.split(".").pop() ?? "pdf";
  const archivo = await leerArchivo(empleado.SUSPENSION_RETENCION_4TA_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": CONTENT_TYPE_POR_EXTENSION[extension] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="suspension-4ta-${idUsuario}.${extension}"`,
    },
  });
}
