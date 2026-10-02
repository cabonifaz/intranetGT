import Link from "next/link";
import type { DiagnosticoGeneracionPlanilla } from "@/lib/rrhh/planilla/diagnostico";

function formatearFecha(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

// Explica EN CONCRETO por que "Generar planilla del mes" no trajo a
// todos (o a nadie) -- antes solo se sugeria "revisa que haya parametros
// vigentes" sin decir que faltaba puntualmente. Ver diagnosticarGeneracionPlanilla.
export default function DiagnosticoPlanillaMensual({ diagnostico }: { diagnostico: DiagnosticoGeneracionPlanilla }) {
  const { parametros, colaboradoresSinGenerar, colaboradoresConConflicto } = diagnostico;
  const hayAlgoQueAvisar =
    !parametros.hayParametrosVigentes ||
    !parametros.tieneTramosRenta5ta ||
    parametros.fondosAfpSinComision.length > 0 ||
    colaboradoresSinGenerar.length > 0 ||
    colaboradoresConConflicto.length > 0;

  if (!hayAlgoQueAvisar) return null;

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Qué falta para que la planilla salga completa</h2>

      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <span aria-hidden>{parametros.hayParametrosVigentes ? "✅" : "❌"}</span>
          {parametros.hayParametrosVigentes ? (
            <span className="text-amber-800 dark:text-amber-300">
              Parámetros legales vigentes desde {parametros.fechaVigenciaDesde ? formatearFecha(parametros.fechaVigenciaDesde) : "-"}.
            </span>
          ) : (
            <span className="text-amber-800 dark:text-amber-300">
              Falta cargar una versión de parámetros legales (UIT, AFP, ONP, EsSalud, Renta) --{" "}
              <Link href="/rrhh/planilla/parametros" className="underline">
                créala en Parámetros de planilla
              </Link>
              . Sin esto no se genera nadie.
            </span>
          )}
        </li>

        {parametros.hayParametrosVigentes && !parametros.tieneTramosRenta5ta ? (
          <li className="flex items-start gap-2">
            <span aria-hidden>⚠️</span>
            <span className="text-amber-800 dark:text-amber-300">
              La versión vigente no tiene tramos de Renta 5ta cargados -- la retención de Renta 5ta va a salir en S/ 0 para todos.
            </span>
          </li>
        ) : null}

        {parametros.hayParametrosVigentes && parametros.fondosAfpSinComision.length > 0 ? (
          <li className="flex items-start gap-2">
            <span aria-hidden>⚠️</span>
            <span className="text-amber-800 dark:text-amber-300">
              Falta la comisión AFP de: <span className="font-medium">{parametros.fondosAfpSinComision.join(", ")}</span> -- a los
              colaboradores de esos fondos les va a faltar ese descuento.
            </span>
          </li>
        ) : null}
      </ul>

      {colaboradoresSinGenerar.length > 0 ? (
        <div className="mt-3 border-t border-amber-200 pt-3 dark:border-amber-900">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {colaboradoresSinGenerar.length} colaborador{colaboradoresSinGenerar.length === 1 ? "" : "es"} con contrato vigente que no se{" "}
            {colaboradoresSinGenerar.length === 1 ? "agregó" : "agregaron"} automáticamente:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300">
            {colaboradoresSinGenerar.map((c) => (
              <li key={c.idContrato}>
                <span className="font-medium">{c.nombreCompleto}</span> -- {c.motivo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {colaboradoresConConflicto.length > 0 ? (
        <div className="mt-3 rounded-lg border-2 border-red-400 bg-red-50 p-3 dark:border-red-700 dark:bg-red-950/40">
          <p className="text-sm font-bold text-red-800 dark:text-red-300">
            🔒 {colaboradoresConConflicto.length} colaborador{colaboradoresConConflicto.length === 1 ? "" : "es"} con más de un
            contrato vigente este mes -- no se genera nada para {colaboradoresConConflicto.length === 1 ? "esta persona" : "estas personas"}{" "}
            hasta que se revise cuál es el correcto (duplicaría el pago):
          </p>
          <ul className="mt-2 space-y-2 text-xs text-red-700 dark:text-red-400">
            {colaboradoresConConflicto.map((c) => (
              <li key={c.idUsuario}>
                <span className="font-medium">{c.nombreCompleto}</span>
                <ul className="ml-4 list-disc">
                  {c.contratos.map((ct) => (
                    <li key={ct.idContrato}>
                      <Link href={`/rrhh/contratos/${ct.idContrato}`} className="underline">
                        Contrato #{ct.idContrato}
                      </Link>{" "}
                      ({ct.tipoContratoCodigo}) -- {formatearFecha(ct.fechaInicio)} a {ct.fechaFin ? formatearFecha(ct.fechaFin) : "indefinido"}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
