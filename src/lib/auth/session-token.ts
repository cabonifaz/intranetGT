import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const JWT_ALG = "HS256";
// Limite exterior generoso del JWT; la fuente de verdad de la expiracion
// real (fin de turno u respaldo de 30min) vive en SESION.FECHA_EXPIRACION.
const JWT_MAX_AGE_SECONDS = 18 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionTokenPayload {
  sid: string;
  uid: number;
  jti: string;
}

export async function crearTokenSesion(idSesion: string, idUsuario: number): Promise<{ token: string; tokenHash: string }> {
  const jti = randomUUID();
  const token = await new SignJWT({ sid: idSesion, uid: idUsuario, jti })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + JWT_MAX_AGE_SECONDS)
    .sign(getSecretKey());

  return { token, tokenHash: hashToken(token) };
}

export function generarIdSesion(): string {
  return randomUUID();
}

export async function verificarTokenSesion(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sid !== "string" || typeof payload.uid !== "number" || typeof payload.jti !== "string") {
      return null;
    }
    return { sid: payload.sid, uid: payload.uid, jti: payload.jti };
  } catch {
    return null;
  }
}

// El token crudo nunca se persiste; solo su hash (comparable en BD sin
// exponer un valor reutilizable si la tabla SESION fuera comprometida).
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
