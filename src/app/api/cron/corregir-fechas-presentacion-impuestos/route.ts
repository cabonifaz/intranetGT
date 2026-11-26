import { NextResponse, type NextRequest } from "next/server";
import { listarDeclaraciones, obtenerDeclaracion, corregirFechaPresentacion } from "@/lib/db/repositories/declaracion-tributaria.repository";
import { leerArchivo } from "@/lib/storage/local-storage";
import { extraerDeclaracionTributaria } from "@/lib/facturacion/impuestos/extraer-declaracion";

const MIME_POR_EXTENSION: Record<string, "application/pdf" | "image/png" | "image/jpeg"> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// Herramienta de uso unico: las declaraciones ya cargadas en produccion
// (antes del fix de FECHA_PRESENTACION) quedaron con el dia de carga a la
// intranet en vez de la fecha real de SUNAT -- esta ruta relee cada
// constancia ya subida (DOCUMENTO_PATH) con el mismo extractor que usa la
// importacion por IA y corrige solo FECHA_PRESENTACION. Se borra del
// repo una vez corregidas las declaraciones existentes.
export async function GET(request: NextRequest) {
  const secreto = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secreto !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const listado = await listarDeclaraciones(null, null);
  const resultados: Array<{ idDeclaracion: number; periodo: string; estado: string; antes: string | null; despues: string | null; aviso?: string }> = [];

  for (const fila of listado) {
    const periodo = fila.MES === 0 ? `${fila.ANIO}` : `${fila.MES}/${fila.ANIO}`;
    if (fila.ESTADO_DECLARACION_CODIGO !== "PRESENTADA" && fila.ESTADO_DECLARACION_CODIGO !== "PAGADA") {
      continue;
    }

    const detalle = await obtenerDeclaracion(fila.ID_DECLARACION);
    if (!detalle?.DOCUMENTO_PATH) {
      resultados.push({ idDeclaracion: fila.ID_DECLARACION, periodo, estado: fila.ESTADO_DECLARACION_CODIGO, antes: fila.FECHA_PRESENTACION, despues: null, aviso: "Sin documento." });
      continue;
    }

    const extension = detalle.DOCUMENTO_PATH.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MIME_POR_EXTENSION[extension];
    if (!mimeType) {
      resultados.push({ idDeclaracion: fila.ID_DECLARACION, periodo, estado: fila.ESTADO_DECLARACION_CODIGO, antes: fila.FECHA_PRESENTACION, despues: null, aviso: `Extension no soportada: ${extension}` });
      continue;
    }

    try {
      const archivo = await leerArchivo(detalle.DOCUMENTO_PATH);
      const datos = await extraerDeclaracionTributaria(new Uint8Array(archivo), mimeType);
      if (!datos.fechaPresentacion) {
        resultados.push({
          idDeclaracion: fila.ID_DECLARACION,
          periodo,
          estado: fila.ESTADO_DECLARACION_CODIGO,
          antes: fila.FECHA_PRESENTACION,
          despues: null,
          aviso: "No se pudo leer la fecha de presentacion de la constancia.",
        });
        continue;
      }

      await corregirFechaPresentacion(fila.ID_DECLARACION, datos.fechaPresentacion);
      resultados.push({ idDeclaracion: fila.ID_DECLARACION, periodo, estado: fila.ESTADO_DECLARACION_CODIGO, antes: fila.FECHA_PRESENTACION, despues: datos.fechaPresentacion });
    } catch (err) {
      resultados.push({
        idDeclaracion: fila.ID_DECLARACION,
        periodo,
        estado: fila.ESTADO_DECLARACION_CODIGO,
        antes: fila.FECHA_PRESENTACION,
        despues: null,
        aviso: err instanceof Error ? err.message : "Error desconocido.",
      });
    }
  }

  return NextResponse.json({ ok: true, resultados });
}
