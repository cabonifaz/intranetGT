import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Capa fina sobre el filesystem local del servidor. Si mas adelante hace
// falta almacenamiento en la nube (S3 o compatible), solo se reescribe
// este archivo -- el resto del codigo llama guardarArchivo/leerArchivo.
function directorioBase(): string {
  return process.env.UPLOADS_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
}

export async function guardarArchivo(rutaRelativa: string, contenido: Uint8Array): Promise<void> {
  const rutaAbsoluta = path.join(directorioBase(), rutaRelativa);
  await mkdir(path.dirname(rutaAbsoluta), { recursive: true });
  await writeFile(rutaAbsoluta, contenido);
}

export async function leerArchivo(rutaRelativa: string): Promise<Buffer> {
  const rutaAbsoluta = path.join(directorioBase(), rutaRelativa);
  return readFile(rutaAbsoluta);
}
