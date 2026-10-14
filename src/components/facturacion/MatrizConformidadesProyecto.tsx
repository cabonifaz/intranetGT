import Link from "next/link";
import PasosConformidad from "./PasosConformidad";
import { crearConformidadAction } from "@/lib/actions/proyecto-conformidad";
import SubmitButton from "@/components/ui/SubmitButton";
import type { ProyectoConformidadMatrizRow } from "@/types/db";

// Matriz de cumplimiento del proyecto: una fila por cada hito que
// requiere conformidad, con su stepper (PasosConformidad) -- el tooltip
// de cada paso (atributo title nativo, sin libreria) ya muestra la fecha
// exacta o que falta, ver ese componente. Solo se renderiza si el
// proyecto tiene REQUIERE_CONFORMIDAD_FACTURACION=1 (ver [id]/page.tsx).
export default function MatrizConformidadesProyecto({
  idProyecto,
  conformidades,
}: {
  idProyecto: number;
  conformidades: ProyectoConformidadMatrizRow[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Matriz de cumplimiento -- Conformidades</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Progreso de la conformidad de cada hito. Pasa el cursor sobre cada paso para ver la fecha de cumplimiento o qué
        falta.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-2 py-2">Hito</th>
              <th className="px-2 py-2">Progreso</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {conformidades.map((c) => (
              <tr key={c.ID_HITO}>
                <td className="px-2 py-2 text-slate-700 dark:text-slate-200">{c.HITO_NOMBRE}</td>
                <td className="px-2 py-2">
                  <PasosConformidad
                    totalItems={c.TOTAL_ITEMS}
                    estadoCodigo={c.ESTADO_CONFORMIDAD_CODIGO}
                    fechaEmision={c.FECHA_EMISION}
                    fechaFirma={c.FECHA_FIRMA}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  {c.ID_CONFORMIDAD ? (
                    <Link href={`/facturacion/proyectos/${idProyecto}/conformidades/${c.ID_CONFORMIDAD}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                      Ver
                    </Link>
                  ) : (
                    <form action={crearConformidadAction}>
                      <input type="hidden" name="idHito" value={c.ID_HITO} />
                      <input type="hidden" name="idProyecto" value={idProyecto} />
                      <input type="hidden" name="titulo" value={`Conformidad - ${c.HITO_NOMBRE}`} />
                      <SubmitButton
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        pendingText="Generando..."
                      >
                        Generar
                      </SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {conformidades.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                  Este proyecto todavía no tiene hitos en su plan de facturación.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
