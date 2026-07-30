import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-user";
import { marcarNotificacionLeida } from "@/lib/db/repositories/notificacion.repository";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await getCurrentSession();
  if (!sesion) {
    return NextResponse.json({ error: "No hay sesion activa." }, { status: 401 });
  }

  const { id } = await params;
  await marcarNotificacionLeida(Number(id), sesion.idUsuario);

  return NextResponse.json({ ok: true });
}
