import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPrestamo } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");

  const { id } = await params;
  const prestamo = await obtenerPrestamo(Number(id));
  if (!prestamo?.DOCUMENTO_FIRMADO_PATH) {
    return NextResponse.json({ error: "Compromiso firmado no disponible." }, { status: 404 });
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
