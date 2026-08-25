import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPlanillaMensual, listarDetalle } from "@/lib/db/repositories/rrhh-planilla.repository";
import { marcarPagadoDetalleAction, marcarPagadoMasivoAction, emitirPlanillaMensualAction } from "@/lib/actions/rrhh-planilla";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import SubmitButton from "@/components/ui/SubmitButton";

function formatearMonto(monto: string | number): string {
  return `S/ ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function etiquetaRegimen(tipoContratoCodigo: string, tipoPagoLocadorDescripcion: string | null): string {
  return tipoContratoCodigo === "LOCADOR" ? `Locador -- ${tipoPagoLocadorDescripcion ?? "-"}` : "Planilla";
}

export default async function PlanillaMensualDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");
  const { id } = await params;
  const idPlanillaMensual = Number(id);

  const planilla = await obtenerPlanillaMensual(idPlanillaMensual);
  if (!planilla) notFound();

  const filas = await listarDetalle(idPlanillaMensual);
  const emitida = planilla.ESTADO_PLANILLA_CODIGO === "EMITIDA";
  const hayPendientes = filas.some((f) => f.ESTADO_EMISION_CODIGO !== "EMITIDA");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rrhh/planilla" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            &larr; Planilla Mensual
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{planilla.PERIODO}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filas.length} colaborador(es) -- {planilla.ESTADO_PLANILLA_DESCRIPCION}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/rrhh/planilla/${idPlanillaMensual}/resumen`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Descargar resumen
          </a>
          <form action={marcarPagadoMasivoAction}>
            <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
            <input type="hidden" name="pagado" value="1" />
            <SubmitButton className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Marcar todos como pagados
            </SubmitButton>
          </form>
          {!emitida ? (
            <form action={emitirPlanillaMensualAction}>
              <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
              <ConfirmSubmitButton
                mensaje="¿Emitir toda la planilla? Genera la boleta/recibo de cada colaborador pendiente y ya no se podran editar los montos."
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Emitir planilla completa
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      {!hayPendientes && filas.length === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          Todavia no hay colaboradores en esta planilla -- vuelve a la lista y usa &quot;Generar/Actualizar planilla&quot;. Si el
          boton no agrega a nadie, revisa que exista una version de parametros vigente en{" "}
          <Link href="/rrhh/planilla/parametros" className="underline">
            /rrhh/planilla/parametros
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Colaborador</th>
              <th className="px-4 py-2">Regimen</th>
              <th className="px-4 py-2 text-right">Bruto</th>
              <th className="px-4 py-2 text-right">Descuentos</th>
              <th className="px-4 py-2 text-right">Neto</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Aportes pagados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filas.map((f) => {
              const descuentos = Number(f.MONTO_BRUTO) - Number(f.MONTO_NETO);
              return (
                <tr key={f.ID_PLANILLA_DETALLE}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/rrhh/planilla/${idPlanillaMensual}/${f.ID_PLANILLA_DETALLE}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {f.NOMBRES} {f.APELLIDOS}
                    </Link>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{f.CARGO}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {etiquetaRegimen(f.TIPO_CONTRATO_CODIGO, f.TIPO_PAGO_LOCADOR_DESCRIPCION)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(f.MONTO_BRUTO)}</td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(descuentos)}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-200">{formatearMonto(f.MONTO_NETO)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        f.ESTADO_EMISION_CODIGO === "EMITIDA"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}
                    >
                      {f.ESTADO_EMISION_DESCRIPCION}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <form action={marcarPagadoDetalleAction}>
                      <input type="hidden" name="idPlanillaDetalle" value={f.ID_PLANILLA_DETALLE} />
                      <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
                      <input type="hidden" name="pagado" value={f.AFP_ESSALUD_PAGADO ? "0" : "1"} />
                      <SubmitButton
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.AFP_ESSALUD_PAGADO
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {f.AFP_ESSALUD_PAGADO ? "Pagado" : "Marcar pagado"}
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {filas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Sin colaboradores todavia.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
