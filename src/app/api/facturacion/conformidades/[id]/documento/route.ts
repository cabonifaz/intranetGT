import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerConformidad } from "@/lib/db/repositories/proyecto-conformidad.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

// Descarga para el gestor de proyectos (con sesion): el firmado si ya se
// firmo, si no el PDF sin firmar generado al emitir (preview). 404 si
// todavia esta en BORRADOR (ningun documento generado aun).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("PROYECTOS_EMPRESA", "LECTURA");
  const { id } = await params;

  const conformidad = await obtenerConformidad(Number(id));
  const rutaDocumento = conformidad?.DOCUMENTO_FIRMADO_PATH ?? conformidad?.DOCUMENTO_PATH;
  if (!rutaDocumento) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const archivo = await leerArchivo(rutaDocumento);
  const firmado = Boolean(conformidad?.DOCUMENTO_FIRMADO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="conformidad-${id}${firmado ? "-firmada" : ""}.pdf"`,
    },
  });
}
