import { callProcedure } from "../callProcedure";
import type { ConfiguracionEmpresaRow } from "@/types/db";

export async function obtenerConfiguracionEmpresa(): Promise<ConfiguracionEmpresaRow | null> {
  const rows = await callProcedure<ConfiguracionEmpresaRow>("SP_CONFIGURACION_EMPRESA_OBTENER", []);
  return rows[0] ?? null;
}

export async function actualizarLogoEmpresa(
  logoUrl: string,
  logoFormato: "png" | "jpg",
  idUsuarioModificacion: number,
): Promise<void> {
  await callProcedure("SP_CONFIGURACION_EMPRESA_LOGO_ACTUALIZAR", [logoUrl, logoFormato, idUsuarioModificacion]);
}
