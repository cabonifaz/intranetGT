import {
  obtenerPlantillaActiva,
  obtenerPlantilla,
  listarClausulasPlantilla,
} from "@/lib/db/repositories/plantilla-contrato.repository";
import { obtenerConfiguracionEmpresa } from "@/lib/db/repositories/configuracion-empresa.repository";
import { leerArchivo } from "@/lib/storage/local-storage";
import type { ContratoDetalleRow } from "@/types/db";
import type { PlantillaContratoPdf } from "./generar-contrato-pdf";

interface PlantillaBase {
  ID_PLANTILLA: number;
  TITULO_DOCUMENTO: string;
  PARRAFO_INTRO: string;
}

// El logo es configuracion general de la empresa (un solo logo para todos
// los contratos, cualquiera sea su plantilla) -- ver
// /administracion/empresa, solo editable por SUPER_ADMIN.
export async function cargarLogoEmpresa(): Promise<{ logoBytes: Uint8Array | null; logoFormato: "png" | "jpg" | null }> {
  const config = await obtenerConfiguracionEmpresa();
  if (!config?.LOGO_URL) return { logoBytes: null, logoFormato: null };

  const logoFormato = config.LOGO_FORMATO === "png" || config.LOGO_FORMATO === "jpg" ? config.LOGO_FORMATO : null;
  if (!logoFormato) return { logoBytes: null, logoFormato: null };

  return { logoBytes: await leerArchivo(config.LOGO_URL), logoFormato };
}

async function cargarPlantillaPdf(plantilla: PlantillaBase): Promise<PlantillaContratoPdf> {
  const [clausulas, logo] = await Promise.all([listarClausulasPlantilla(plantilla.ID_PLANTILLA), cargarLogoEmpresa()]);

  return {
    tituloDocumento: plantilla.TITULO_DOCUMENTO,
    parrafoIntro: plantilla.PARRAFO_INTRO,
    clausulas: clausulas.map((c) => ({ titulo: c.TITULO, contenido: c.CONTENIDO })),
    logoBytes: logo.logoBytes,
    logoFormato: logo.logoFormato,
  };
}

// Resuelve la plantilla activa del regimen del contrato (maestro de
// contratos) + sus clausulas + el logo de la empresa, listos para
// generarContratoPdf(). null si RRHH aun no cargo una plantilla para ese
// regimen -- no deberia pasar porque crearContratoAction ya lo bloquea,
// pero se revalida aqui por si la plantilla se desactivo despues.
export async function resolverPlantillaContrato(contrato: ContratoDetalleRow): Promise<PlantillaContratoPdf | null> {
  const plantilla = await obtenerPlantillaActiva(contrato.ID_TIPO_CONTRATO, contrato.ID_TIPO_PAGO_LOCADOR);
  if (!plantilla) return null;
  return cargarPlantillaPdf(plantilla);
}

// Carga una plantilla puntual por ID (activa o no) -- usado para la vista
// previa de ejemplo desde /rrhh/contratos/plantillas/[id], donde RRHH
// quiere ver como se veria justo esa plantilla, sin depender de que este
// activa ni de que exista un contrato real.
export async function cargarPlantillaPorId(idPlantilla: number): Promise<PlantillaContratoPdf | null> {
  const plantilla = await obtenerPlantilla(idPlantilla);
  if (!plantilla) return null;
  return cargarPlantillaPdf(plantilla);
}
