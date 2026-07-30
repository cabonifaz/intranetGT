import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { PlanillaParametroRow, PlanillaParametroTramoRow, PlanillaParametroAfpFondoRow } from "@/types/db";

interface CrearParametroParams {
  anio: number;
  fechaVigenciaDesde: string;
  uit: number;
  porcentajeOnp: number;
  porcentajeEssalud: number;
  aporteObligatorioAfpPorcentaje: number;
  primaSeguroAfpPorcentaje: number;
  topeAsegurableAfp: number;
  porcentajeRenta4ta: number;
  umbralRenta4ta: number;
  uitDeduccionRenta5ta: number;
  idUsuarioCreacion: number;
}

export async function crearParametro(params: CrearParametroParams): Promise<{ id_parametro: number }> {
  const resultado = await callProcedureWithOut<{ id_parametro: number | null }>(
    "SP_RRHH_PLANILLA_PARAMETRO_CREAR",
    [
      params.anio,
      params.fechaVigenciaDesde,
      params.uit,
      params.porcentajeOnp,
      params.porcentajeEssalud,
      params.aporteObligatorioAfpPorcentaje,
      params.primaSeguroAfpPorcentaje,
      params.topeAsegurableAfp,
      params.porcentajeRenta4ta,
      params.umbralRenta4ta,
      params.uitDeduccionRenta5ta,
      params.idUsuarioCreacion,
    ],
    ["id_parametro"],
  );
  if (!resultado.id_parametro) throw new Error("No se pudo crear la version de parametros de planilla.");
  return resultado as { id_parametro: number };
}

export async function agregarTramoRenta5ta(idParametro: number, desdeUit: number, hastaUit: number | null, tasa: number, orden: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR", [idParametro, desdeUit, hastaUit, tasa, orden]);
}

export async function agregarComisionAfpFondo(idParametro: number, idAfpFondo: number, comisionPorcentaje: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_AGREGAR", [idParametro, idAfpFondo, comisionPorcentaje]);
}

export async function obtenerParametroVigente(fecha: string): Promise<PlanillaParametroRow | null> {
  const rows = await callProcedure<PlanillaParametroRow>("SP_RRHH_PLANILLA_PARAMETRO_OBTENER_VIGENTE", [fecha]);
  return rows[0] ?? null;
}

export async function listarTramosRenta5ta(idParametro: number): Promise<PlanillaParametroTramoRow[]> {
  return callProcedure<PlanillaParametroTramoRow>("SP_RRHH_PLANILLA_PARAMETRO_TRAMO_LISTAR", [idParametro]);
}

export async function listarComisionesAfpFondo(idParametro: number): Promise<PlanillaParametroAfpFondoRow[]> {
  return callProcedure<PlanillaParametroAfpFondoRow>("SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_LISTAR", [idParametro]);
}

export async function listarVersionesParametro(): Promise<PlanillaParametroRow[]> {
  return callProcedure<PlanillaParametroRow>("SP_RRHH_PLANILLA_PARAMETRO_LISTAR", []);
}
