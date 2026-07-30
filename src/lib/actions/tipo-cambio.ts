"use server";

import { revalidatePath, refresh } from "next/cache";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { fijarTipoCambio } from "@/lib/db/repositories/tipo-cambio.repository";
import { actualizarTipoCambioSunatAhora } from "@/lib/facturacion/tipo-cambio-sunat";

const TIPO_CAMBIO_APP_CODIGO = "TIPO_CAMBIO";

// Fijar un TC nuevo para una categoria es agregar una fila al historico
// -- nunca se sobreescribe la anterior (ver SP_TIPO_CAMBIO_FIJAR). Pide
// ADMIN porque afecta el costeo de cualquier proyecto que use esa
// categoria de ahi en adelante.
export async function fijarTipoCambioAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(TIPO_CAMBIO_APP_CODIGO, "ADMIN");

  const idCategoriaTc = Number(formData.get("idCategoriaTc"));
  const valorRaw = String(formData.get("valor") ?? "").trim();
  const valor = valorRaw ? Number(valorRaw) : 0;

  if (!idCategoriaTc || !valor) return;

  await fijarTipoCambio(idCategoriaTc, valor, sesion.idUsuario);
  revalidatePath("/facturacion/tipo-cambio");
  refresh();
}

// Boton "Actualizar TC ahora": vuelve a consultar la API SUNAT aunque el
// sync automatico del dia ya haya corrido, y fija las 4 categorias con
// el TC Venta obtenido -- ver actualizarTipoCambioSunatAhora. Si la API
// falla no hace nada (las categorias se quedan con su ultimo valor
// vigente); no hay forma de mostrar ese error inline sin convertir la
// pantalla a cliente, mismo criterio del resto de acciones de este modulo.
export async function actualizarTipoCambioSunatAction(): Promise<void> {
  const sesion = await requirePermiso(TIPO_CAMBIO_APP_CODIGO, "ADMIN");

  await actualizarTipoCambioSunatAhora(sesion.idUsuario);
  revalidatePath("/facturacion/tipo-cambio");
  refresh();
}
