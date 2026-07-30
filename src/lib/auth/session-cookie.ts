import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "gt_session";

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sin maxAge: cookie de sesion de navegador. La vigencia real la
    // controla SESION.FECHA_EXPIRACION en BD (ver lib/auth/get-current-user).
  });
}

export async function getSessionCookieValue(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
