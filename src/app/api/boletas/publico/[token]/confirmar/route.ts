import { NextResponse } from "next/server";
import { obtenerDetallePorToken, confirmarRecepcionBoleta } from "@/lib/db/repositories/rrhh-planilla.repository";

// Confirmacion de recepcion de la boleta por el propio colaborador, sin
// sesion (link publico con token, ver /boletas/firmar/[token]). El
// ID_USUARIO lo resuelve el propio token (siempre es el dueño del
// contrato), no hace falta sesion para saber quien es -- mismo SP que
// usa confirmarRecepcionBoletaAction (con sesion); el guard de ID_USUARIO
// del SP igual pasa, porque viene del mismo registro resuelto por token.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
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

  await confirmarRecepcionBoleta(detalle.ID_PLANILLA_DETALLE, detalle.ID_USUARIO);

  return NextResponse.json({ ok: true });
}
