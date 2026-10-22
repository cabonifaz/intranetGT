import { NextResponse } from "next/server";
import { obtenerDetallePorToken } from "@/lib/db/repositories/rrhh-planilla.repository";
import { leerArchivo } from "@/lib/storage/local-storage";
import { tieneFormaDeToken } from "@/lib/validar-token";

// PDF de la boleta ya emitida, para el link publico de confirmacion de
// recepcion (ver /boletas/firmar/[token]). Misma vigencia que el token.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const detalle = tieneFormaDeToken(token) ? await obtenerDetallePorToken(token) : null;
  if (!detalle) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (detalle.ESTADO_EMISION_CODIGO !== "EMITIDA" || detalle.FECHA_CONFIRMACION_COLABORADOR) {
    return NextResponse.json({ error: "Este link ya no está disponible." }, { status: 409 });
  }
  if (!detalle.TOKEN_EXPIRA || new Date(detalle.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link ha expirado. Pide a Recursos Humanos que genere uno nuevo." }, { status: 410 });
  }
  if (!detalle.DOCUMENTO_PATH) {
    return NextResponse.json({ error: "El documento todavía no está disponible." }, { status: 404 });
  }

  const archivo = await leerArchivo(detalle.DOCUMENTO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="boleta.pdf"',
    },
  });
}
