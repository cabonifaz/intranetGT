import { NextResponse } from "next/server";
import { obtenerFirmanteConformidadPorToken } from "@/lib/db/repositories/proyecto-conformidad.repository";
import { leerArchivo } from "@/lib/storage/local-storage";
import { tieneFormaDeToken } from "@/lib/validar-token";

// PDF sin firma ya generado al Emitir (DOCUMENTO_PATH, del lado de la
// conformidad -- es el mismo documento para todos sus firmantes) -- para
// que quien va a firmar lo pueda leer completo antes (link publico con
// token, ver /conformidades/firmar/[token]). Misma vigencia que el
// endpoint de firma.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const firmante = tieneFormaDeToken(token) ? await obtenerFirmanteConformidadPorToken(token) : null;
  if (!firmante) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (firmante.ESTADO_CONFORMIDAD_CODIGO !== "EMITIDA" || firmante.FECHA_FIRMA !== null) {
    return NextResponse.json({ error: "Esta conformidad ya no está disponible." }, { status: 409 });
  }
  if (!firmante.TOKEN_EXPIRA || new Date(firmante.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link ha expirado. Pide a tu contacto que genere uno nuevo." }, { status: 410 });
  }
  if (!firmante.DOCUMENTO_PATH) {
    return NextResponse.json({ error: "El documento todavía no está disponible." }, { status: 404 });
  }

  const archivo = await leerArchivo(firmante.DOCUMENTO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="conformidad-vista-previa.pdf"',
    },
  });
}
