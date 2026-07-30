import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-user";

// Heartbeat: el cliente lo llama periodicamente (actividad del usuario) para
// que SP_SESION_RENOVAR recalcule la expiracion segun horario/inactividad.
export async function GET() {
  const sesion = await getCurrentSession();
  if (!sesion) {
    return NextResponse.json({ activa: false }, { status: 401 });
  }
  return NextResponse.json({
    activa: true,
    dentroHorario: sesion.dentroHorario,
    fechaExpiracion: sesion.fechaExpiracion,
  });
}
