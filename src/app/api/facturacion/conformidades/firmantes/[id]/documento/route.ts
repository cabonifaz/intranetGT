import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerFirmanteConformidad } from "@/lib/db/repositories/proyecto-conformidad.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// Descarga para el gestor (con sesion) del documento que un firmante
// puntual subio manualmente (firma en papel escaneada o foto) -- ver
// subirFirmanteFirmadoAction. No existe si ese firmante firmo por el
// link digital (ahi la firma ya queda incrustada en el PDF combinado de
// la conformidad, ver api/facturacion/conformidades/[id]/documento).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("PROYECTOS_EMPRESA", "LECTURA");
  const { id } = await params;

  const firmante = await obtenerFirmanteConformidad(Number(id));
  if (!firmante?.DOCUMENTO_FIRMADO_INDIVIDUAL_PATH) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const extension = firmante.DOCUMENTO_FIRMADO_INDIVIDUAL_PATH.split(".").pop()?.toLowerCase() ?? "";
  const archivo = await leerArchivo(firmante.DOCUMENTO_FIRMADO_INDIVIDUAL_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": CONTENT_TYPE_POR_EXTENSION[extension] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="firmante-${id}.${extension || "pdf"}"`,
    },
  });
}
