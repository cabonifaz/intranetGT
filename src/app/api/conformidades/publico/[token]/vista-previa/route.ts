import { NextResponse } from "next/server";
import { obtenerConformidadPorToken } from "@/lib/db/repositories/proyecto-conformidad.repository";
import { leerArchivo } from "@/lib/storage/local-storage";
import { tieneFormaDeToken } from "@/lib/validar-token";

// PDF sin firma ya generado al Emitir (DOCUMENTO_PATH) -- para que el
// cliente lo pueda leer completo antes de firmar (link publico con
// token, ver /conformidades/firmar/[token]). Misma vigencia que el
// endpoint de firma.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const conformidad = tieneFormaDeToken(token) ? await obtenerConformidadPorToken(token) : null;
  if (!conformidad) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (conformidad.ESTADO_CONFORMIDAD_CODIGO !== "EMITIDA") {
    return NextResponse.json({ error: "Esta conformidad ya no está disponible." }, { status: 409 });
  }
  if (!conformidad.TOKEN_EXPIRA || new Date(conformidad.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link ha expirado. Pide a tu contacto que genere uno nuevo." }, { status: 410 });
  }
  if (!conformidad.DOCUMENTO_PATH) {
    return NextResponse.json({ error: "El documento todavía no está disponible." }, { status: 404 });
  }

  const archivo = await leerArchivo(conformidad.DOCUMENTO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="conformidad-vista-previa.pdf"',
    },
  });
}
