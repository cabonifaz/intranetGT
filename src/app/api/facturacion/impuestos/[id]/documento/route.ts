import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerDeclaracion } from "@/lib/db/repositories/declaracion-tributaria.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

// Descarga de la constancia/comprobante de SUNAT subida como respaldo --
// nunca se genera, solo se guarda lo que RRHH/Facturacion sube (ver
// subirDocumentoDeclaracionAction).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("IMPUESTOS_EMPRESA", "LECTURA");
  const { id } = await params;

  const declaracion = await obtenerDeclaracion(Number(id));
  if (!declaracion?.DOCUMENTO_PATH) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const extension = declaracion.DOCUMENTO_PATH.split(".").pop() ?? "";
  const contentType = CONTENT_TYPE_POR_EXTENSION[extension] ?? "application/octet-stream";
  const archivo = await leerArchivo(declaracion.DOCUMENTO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="declaracion-${id}.${extension}"`,
    },
  });
}
