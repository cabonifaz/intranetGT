import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

// mysql2 no corre en Edge Runtime, asi que este middleware solo hace la
// verificacion barata (existe cookie + firma JWT valida). La verificacion
// autoritativa contra BD (estado real de la sesion, regla de horario/30min)
// ocurre en requireSession() dentro de (intranet)/layout.tsx y en cada
// route handler — defensa en profundidad sin atar el middleware a Node runtime.
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno SESSION_JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    await jwtVerify(token, getSecretKey());
    return NextResponse.next();
  } catch {
    const response = redirectToLogin(request);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // contratos/firmar y api/contratos/publico son publicos (link con token,
    // sin sesion) -- ver src/app/contratos/firmar/[token]/page.tsx.
    // api/cron/* lo llama un cron externo (sin cookie de sesion), se
    // autentica con CRON_SECRET dentro de cada route handler.
    "/((?!login|api/auth|contratos/firmar|api/contratos/publico|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)).*)",
  ],
};
