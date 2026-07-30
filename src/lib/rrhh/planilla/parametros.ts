import {
  obtenerParametroVigente,
  listarTramosRenta5ta,
  listarComisionesAfpFondo,
} from "@/lib/db/repositories/rrhh-planilla-parametro.repository";
import type { ParametrosPlanillaVigentes } from "./calculo";

// Version vigente a una fecha (por defecto hoy) ya armada para calculo.ts
// -- null si todavia no se cargo ninguna version desde /rrhh/planilla/parametros
// (no deberia pasar en produccion, el seed 036 carga una inicial, pero
// una base de datos nueva sin aplicar ese seed si puede quedar sin nada).
export async function obtenerParametrosVigentes(fecha: string = new Date().toISOString().slice(0, 10)): Promise<ParametrosPlanillaVigentes | null> {
  const parametro = await obtenerParametroVigente(fecha);
  if (!parametro) return null;

  const [tramos, comisiones] = await Promise.all([listarTramosRenta5ta(parametro.ID_PARAMETRO), listarComisionesAfpFondo(parametro.ID_PARAMETRO)]);

  const comisionesAfpPorFondo: Record<string, number> = {};
  for (const c of comisiones) comisionesAfpPorFondo[c.AFP_FONDO_CODIGO] = Number(c.COMISION_PORCENTAJE);

  return {
    idParametro: parametro.ID_PARAMETRO,
    uit: Number(parametro.UIT),
    porcentajeOnp: Number(parametro.PORCENTAJE_ONP),
    porcentajeEssalud: Number(parametro.PORCENTAJE_ESSALUD),
    aporteObligatorioAfpPorcentaje: Number(parametro.APORTE_OBLIGATORIO_AFP_PORCENTAJE),
    primaSeguroAfpPorcentaje: Number(parametro.PRIMA_SEGURO_AFP_PORCENTAJE),
    topeAsegurableAfp: Number(parametro.TOPE_ASEGURABLE_AFP),
    porcentajeRenta4ta: Number(parametro.PORCENTAJE_RENTA_4TA),
    umbralRenta4ta: Number(parametro.UMBRAL_RENTA_4TA),
    uitDeduccionRenta5ta: Number(parametro.UIT_DEDUCCION_RENTA_5TA),
    tramosRenta5ta: tramos.map((t) => ({
      desdeUit: Number(t.DESDE_UIT),
      hastaUit: t.HASTA_UIT !== null ? Number(t.HASTA_UIT) : null,
      tasa: Number(t.TASA),
    })),
    comisionesAfpPorFondo,
  };
}
