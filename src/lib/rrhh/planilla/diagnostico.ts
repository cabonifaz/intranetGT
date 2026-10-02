import { listarContratosElegibles, listarHorasDelPeriodo } from "@/lib/db/repositories/rrhh-planilla.repository";
import { listarPeriodosPago } from "@/lib/db/repositories/rrhh-periodo-pago.repository";
import { listarConceptosContrato } from "@/lib/db/repositories/contrato.repository";
import { obtenerParametroVigente } from "@/lib/db/repositories/rrhh-planilla-parametro.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { obtenerParametrosVigentes } from "./parametros";
import { generarPeriodosPendientes, etiquetaPeriodoMensual } from "@/lib/rrhh/periodos-pago";
import type { AfpFondoCodigo, PlanillaContratoElegibleRow } from "@/types/db";

// Repasa, sin persistir nada, las mismas condiciones que
// generarPlanillaMensualAction usa para decidir si agrega o no a un
// colaborador -- para poder MOSTRAR el motivo puntual en vez de que la
// planilla simplemente quede con menos gente (o vacia) sin explicacion.
// Se llama antes de generar (o al ver una planilla que no agrego a
// alguien esperado).

export interface DiagnosticoParametros {
  hayParametrosVigentes: boolean;
  fechaVigenciaDesde: string | null;
  tieneTramosRenta5ta: boolean;
  fondosAfpSinComision: string[];
}

export interface ColaboradorSinGenerar {
  idContrato: number;
  nombreCompleto: string;
  motivo: string;
}

export interface ColaboradorConContratosEnConflicto {
  idUsuario: number;
  nombreCompleto: string;
  contratos: { idContrato: number; tipoContratoCodigo: string; fechaInicio: string; fechaFin: string | null }[];
}

export interface DiagnosticoGeneracionPlanilla {
  parametros: DiagnosticoParametros;
  colaboradoresSinGenerar: ColaboradorSinGenerar[];
  colaboradoresConConflicto: ColaboradorConContratosEnConflicto[];
}

function esVigenteEnMes(contrato: PlanillaContratoElegibleRow, inicioMes: string, finMes: string): boolean {
  if (contrato.FECHA_INICIO > finMes) return false;
  if (contrato.FECHA_FIN && contrato.FECHA_FIN < inicioMes) return false;
  return true;
}

export async function diagnosticarGeneracionPlanilla(
  anio: number,
  mes: number,
  contratosYaEnPlanilla: Set<number> = new Set(),
): Promise<DiagnosticoGeneracionPlanilla> {
  const periodo = etiquetaPeriodoMensual(anio, mes - 1);
  const buscado = periodo.trim().toUpperCase();
  const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const finMes = new Date(anio, mes, 0).toISOString().slice(0, 10);

  const [parametroRaw, parametros, contratos, fondosAfp] = await Promise.all([
    obtenerParametroVigente(new Date().toISOString().slice(0, 10)),
    obtenerParametrosVigentes(),
    listarContratosElegibles(),
    listarMaestros("AFP_FONDO"),
  ]);

  const vigentesEsteMesTodos = contratos.filter((c) => esVigenteEnMes(c, inicioMes, finMes));

  // Un colaborador no puede tener mas de un contrato vigente generando
  // planilla el mismo mes (duplicaria su pago) -- si tiene 2+, se separan
  // en su propia categoria y se excluyen del resto del diagnostico (y de
  // la generacion real, ver generarPlanillaMensual) hasta que alguien
  // revise cual de los contratos es el correcto.
  const contratosPorUsuario = new Map<number, PlanillaContratoElegibleRow[]>();
  for (const c of vigentesEsteMesTodos) {
    const lista = contratosPorUsuario.get(c.ID_USUARIO) ?? [];
    lista.push(c);
    contratosPorUsuario.set(c.ID_USUARIO, lista);
  }
  const colaboradoresConConflicto: ColaboradorConContratosEnConflicto[] = [...contratosPorUsuario.values()]
    .filter((lista) => lista.length > 1)
    .map((lista) => ({
      idUsuario: lista[0].ID_USUARIO,
      nombreCompleto: `${lista[0].NOMBRES} ${lista[0].APELLIDOS}`,
      contratos: lista.map((c) => ({
        idContrato: c.ID_CONTRATO,
        tipoContratoCodigo: c.TIPO_CONTRATO_CODIGO,
        fechaInicio: c.FECHA_INICIO,
        fechaFin: c.FECHA_FIN,
      })),
    }));
  const idsUsuarioConConflicto = new Set(colaboradoresConConflicto.map((c) => c.idUsuario));

  const vigentesEsteMes = vigentesEsteMesTodos.filter(
    (c) => !contratosYaEnPlanilla.has(c.ID_CONTRATO) && !idsUsuarioConConflicto.has(c.ID_USUARIO),
  );

  const descripcionPorCodigoFondo = new Map(fondosAfp.map((f) => [f.CODIGO, f.DESCRIPCION]));
  const fondosAfpSinComision: string[] = [];
  let tieneTramosRenta5ta = false;

  if (parametros) {
    tieneTramosRenta5ta = parametros.tramosRenta5ta.length > 0;
    const fondosEnUso = new Set(vigentesEsteMes.map((c) => c.AFP_FONDO_CODIGO).filter((c): c is AfpFondoCodigo => Boolean(c)));
    for (const fondo of fondosEnUso) {
      if (!(fondo in parametros.comisionesAfpPorFondo)) {
        fondosAfpSinComision.push(descripcionPorCodigoFondo.get(fondo) ?? fondo);
      }
    }
  }

  const colaboradoresSinGenerar: ColaboradorSinGenerar[] = [];

  if (parametros) {
    for (const contrato of vigentesEsteMes) {
      const nombreCompleto = `${contrato.NOMBRES} ${contrato.APELLIDOS}`;

      if (contrato.TIPO_CONTRATO_CODIGO === "LOCADOR" && contrato.TIPO_PAGO_LOCADOR_CODIGO === "POR_HORA") {
        const horas = await listarHorasDelPeriodo(contrato.ID_CONTRATO, periodo);
        if (horas.length === 0) {
          colaboradoresSinGenerar.push({ idContrato: contrato.ID_CONTRATO, nombreCompleto, motivo: "Sin horas cargadas este mes" });
          continue;
        }
        const monedas = new Set(horas.map((h) => h.MONEDA_CODIGO));
        if (monedas.size > 1) {
          colaboradoresSinGenerar.push({ idContrato: contrato.ID_CONTRATO, nombreCompleto, motivo: "Tiene horas en más de una moneda este mes" });
          continue;
        }
        const bruto = horas.reduce((suma, h) => suma + Number(h.MONTO_CALCULADO), 0);
        if (!bruto) {
          colaboradoresSinGenerar.push({ idContrato: contrato.ID_CONTRATO, nombreCompleto, motivo: "El total de horas de este mes da S/ 0" });
        }
        continue;
      }

      const periodosActuales = await listarPeriodosPago(contrato.ID_CONTRATO);
      const existente = periodosActuales.find((p) => p.PERIODO.trim().toUpperCase() === buscado);
      if (existente) {
        if (!(Number(existente.MONTO) > 0)) {
          colaboradoresSinGenerar.push({ idContrato: contrato.ID_CONTRATO, nombreCompleto, motivo: "Su periodo de pago de este mes tiene monto S/ 0" });
        }
        continue;
      }

      const pendientes = generarPeriodosPendientes(
        contrato.FECHA_INICIO,
        contrato.FECHA_FIN,
        periodosActuales.map((p) => p.PERIODO),
      );
      if (!pendientes.some((p) => p.trim().toUpperCase() === buscado)) {
        colaboradoresSinGenerar.push({
          idContrato: contrato.ID_CONTRATO,
          nombreCompleto,
          motivo: "No genera periodo de pago este mes -- revisa la fecha de inicio/fin del contrato",
        });
        continue;
      }

      const esPlanilla = contrato.TIPO_CONTRATO_CODIGO !== "LOCADOR";
      const conceptos = esPlanilla ? await listarConceptosContrato(contrato.ID_CONTRATO) : [];
      const montoSugerido = esPlanilla ? conceptos.reduce((suma, c) => suma + Number(c.MONTO), 0) : Number(contrato.TARIFA ?? 0);
      if (!montoSugerido) {
        colaboradoresSinGenerar.push({
          idContrato: contrato.ID_CONTRATO,
          nombreCompleto,
          motivo: esPlanilla ? "Sin conceptos de sueldo configurados en su contrato" : "Sin tarifa configurada en su contrato",
        });
      }
    }
  }

  return {
    parametros: {
      hayParametrosVigentes: Boolean(parametros),
      fechaVigenciaDesde: parametroRaw?.FECHA_VIGENCIA_DESDE ?? null,
      tieneTramosRenta5ta,
      fondosAfpSinComision,
    },
    colaboradoresSinGenerar,
    colaboradoresConConflicto,
  };
}
