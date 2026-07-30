import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./pool";

/**
 * Llama un procedimiento almacenado que solo retorna result sets
 * (sin parametros OUT). Uso: const rows = await callProcedure<Fila>("SP_X", [a, b]);
 */
export async function callProcedure<T extends RowDataPacket = RowDataPacket>(
  name: string,
  params: unknown[] = [],
): Promise<T[]> {
  const placeholders = params.map(() => "?").join(", ");
  const [rows] = await pool.query<T[][] | T[]>(`CALL ${name}(${placeholders})`, params);
  const resultSets = rows as unknown as T[][];
  return Array.isArray(resultSets[0]) ? resultSets[0] : (resultSets as unknown as T[]);
}

/**
 * Llama un procedimiento que tiene parametros OUT. Los OUT se resuelven via
 * variables de sesion MySQL (@nombre), por eso se pide una conexion dedicada
 * del pool en vez de usar pool.query directamente (las variables @ son por
 * conexion, no globales).
 */
export async function callProcedureWithOut<T>(
  name: string,
  inParams: unknown[],
  outNames: string[],
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    const inPlaceholders = inParams.map(() => "?").join(", ");
    const outPlaceholders = outNames.map((n) => `@${n}`).join(", ");
    const allPlaceholders = [inPlaceholders, outPlaceholders].filter(Boolean).join(", ");
    await conn.query(`CALL ${name}(${allPlaceholders})`, inParams);

    const selectList = outNames.map((n) => `@${n} AS ${n}`).join(", ");
    const [rows] = await conn.query<RowDataPacket[]>(`SELECT ${selectList}`);
    return rows[0] as T;
  } finally {
    conn.release();
  }
}
