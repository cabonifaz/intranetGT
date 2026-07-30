import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-user";
import { marcarTodasLasNotificacionesLeidas } from "@/lib/db/repositories/notificacion.repository";

export async function POST() {
  const sesion = await getCurrentSession();
  if (!sesion) {
    return NextResponse.json({ error: "No hay sesion activa." }, { status: 401 });
  }

  await marcarTodasLasNotificacionesLeidas(sesion.idUsuario);

  return NextResponse.json({ ok: true });
}
