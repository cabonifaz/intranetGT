import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Evita caracteres ambiguos (0/O, 1/l/I) para que se pueda transcribir a mano
// sin errores al comunicarsela a la persona.
const ALFABETO_CLAVE_TEMPORAL = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";

export function generarClaveTemporal(longitud = 12): string {
  let clave = "";
  for (let i = 0; i < longitud; i++) {
    clave += ALFABETO_CLAVE_TEMPORAL[randomInt(ALFABETO_CLAVE_TEMPORAL.length)];
  }
  return clave;
}
