import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-user";
import {
  contarNotificacionesNoLeidas,
  listarNotificacionesPorUsuario,
} from "@/lib/db/repositories/notificacion.repository";

export async function GET(request: NextRequest) {
  const sesion = await getCurrentSession();
  if (!sesion) {
    return NextResponse.json({ error: "No hay sesion activa." }, { status: 401 });
  }

  const soloNoLeidas = request.nextUrl.searchParams.get("soloNoLeidas") === "1";
  const limite = Number(request.nextUrl.searchParams.get("limite") ?? 20);
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);

  const [notificaciones, noLeidas] = await Promise.all([
    listarNotificacionesPorUsuario(sesion.idUsuario, soloNoLeidas, limite, offset),
    contarNotificacionesNoLeidas(sesion.idUsuario),
  ]);

  return NextResponse.json({ notificaciones, noLeidas });
}
