import { NextResponse } from "next/server";
import { getSessionCookieValue, clearSessionCookie } from "@/lib/auth/session-cookie";
import { verificarTokenSesion } from "@/lib/auth/session-token";
import { cerrarSesion } from "@/lib/db/repositories/sesion.repository";

export async function POST() {
  const token = await getSessionCookieValue();

  if (token) {
    const payload = await verificarTokenSesion(token);
    if (payload) {
      await cerrarSesion(payload.sid, "LOGOUT");
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
