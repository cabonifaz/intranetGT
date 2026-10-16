import { NextResponse } from "next/server";
import { obtenerDetallePorToken, confirmarRecepcionBoleta } from "@/lib/db/repositories/rrhh-planilla.repository";
import { guardarArchivo } from "@/lib/storage/local-storage";

function decodificarFirmaPng(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

// Confirmacion de recepcion de la boleta por el propio colaborador, sin
// sesion (link publico con token, ver /boletas/firmar/[token]), con su
// firma como aceptacion. El ID_USUARIO lo resuelve el propio token
// (siempre es el dueño del contrato), no hace falta sesion para saber
// quien es -- mismo SP que usa confirmarRecepcionBoletaAction (con
// sesion); el guard de ID_USUARIO del SP igual pasa, porque viene del
// mismo registro resuelto por token.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const detalle = await obtenerDetallePorToken(token);
  if (!detalle) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (detalle.ESTADO_EMISION_CODIGO !== "EMITIDA" || detalle.FECHA_CONFIRMACION_COLABORADOR) {
    return NextResponse.json({ error: "Este link ya no está disponible." }, { status: 409 });
  }
  if (!detalle.TOKEN_EXPIRA || new Date(detalle.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link ha expirado. Pide a Recursos Humanos que genere uno nuevo." }, { status: 410 });
  }

  let body: { firmaPngDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }
  if (!body.firmaPngDataUrl) {
    return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
  }

  const firmaPngPath = `rrhh/planilla/recepcion-firmada/${detalle.ID_PLANILLA_DETALLE}.png`;
  await guardarArchivo(firmaPngPath, decodificarFirmaPng(body.firmaPngDataUrl));
  await confirmarRecepcionBoleta(detalle.ID_PLANILLA_DETALLE, detalle.ID_USUARIO, firmaPngPath);

  return NextResponse.json({ ok: true });
}
