import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-user";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { cerrarTodasLasSesionesDelUsuario } from "@/lib/db/repositories/sesion.repository";

// Cierra TODAS las sesiones activas del usuario (incluida la actual): no
// existe hoy un mecanismo para excluir la sesion en curso, asi que tambien
// se limpia la cookie local para reflejarlo de inmediato.
export async function POST() {
  const sesion = await getCurrentSession();
  if (!sesion) {
    return NextResponse.json({ error: "No hay sesion activa." }, { status: 401 });
  }

  await cerrarTodasLasSesionesDelUsuario(sesion.idUsuario);
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
