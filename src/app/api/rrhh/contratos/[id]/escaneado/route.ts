import { NextResponse } from "next/server";
import { requireImportarContrato } from "@/lib/auth/require-permiso";
import { obtenerImportacionContrato } from "@/lib/db/repositories/contrato-importacion.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

// El escaneo original que se subio para la importacion -- distinto de
// /api/contratos/[id]/documento (que sirve DOCUMENTO_PATH, el mismo
// archivo mientras el contrato este importado, pero puede diferir si mas
// adelante se reemplaza).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireImportarContrato();

  const { id } = await params;
  const importacion = await obtenerImportacionContrato(Number(id));
  if (!importacion) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const extension = importacion.DOCUMENTO_ESCANEADO_PATH.split(".").pop() ?? "pdf";
  const archivo = await leerArchivo(importacion.DOCUMENTO_ESCANEADO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": CONTENT_TYPE_POR_EXTENSION[extension] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="solicitud-escaneada-contrato-${importacion.ID_CONTRATO}.${extension}"`,
    },
  });
}
