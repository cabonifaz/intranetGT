import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { crearTokenSesion, generarIdSesion } from "@/lib/auth/session-token";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import {
  obtenerUsuarioParaLogin,
  registrarLoginExitoso,
  registrarLoginFallido,
} from "@/lib/db/repositories/usuario.repository";
import { crearSesion } from "@/lib/db/repositories/sesion.repository";

export async function POST(request: NextRequest) {
  let body: { usuario?: string; clave?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la peticion invalido." }, { status: 400 });
  }

  const usuario = body.usuario?.trim();
  const clave = body.clave;

  if (!usuario || !clave) {
    return NextResponse.json({ error: "Usuario y clave son requeridos." }, { status: 400 });
  }

  const registro = await obtenerUsuarioParaLogin(usuario);
  const credencialesInvalidas = () => NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 });

  if (!registro) {
    return credencialesInvalidas();
  }

  if (registro.ESTADO_USUARIO_CODIGO === "BLOQUEADO") {
    return NextResponse.json(
      { error: "Tu usuario esta bloqueado por intentos fallidos. Contacta al administrador." },
      { status: 403 },
    );
  }

  if (registro.ESTADO_USUARIO_CODIGO === "INACTIVO") {
    return NextResponse.json({ error: "Tu usuario no esta activo." }, { status: 403 });
  }

  const claveValida = await verifyPassword(clave, registro.CLAVE_HASH);
  if (!claveValida) {
    await registrarLoginFallido(registro.ID_USUARIO);
    return credencialesInvalidas();
  }

  await registrarLoginExitoso(registro.ID_USUARIO);

  const idSesion = generarIdSesion();
  const { token, tokenHash } = await crearTokenSesion(idSesion, registro.ID_USUARIO);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");

  await crearSesion({
    idUsuario: registro.ID_USUARIO,
    idSesion,
    tokenHash,
    ip,
    userAgent,
  });

  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    requiereCambioClave: Boolean(registro.REQUIERE_CAMBIO_CLAVE),
  });
}
