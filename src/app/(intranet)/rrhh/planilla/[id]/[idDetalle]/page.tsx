import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerDetalle } from "@/lib/db/repositories/rrhh-planilla.repository";
import {
  actualizarMontosDetalleAction,
  recalcularDetalleAction,
  marcarPagadoDetalleAction,
  emitirDetalleAction,
  regenerarDocumentoDetalleAction,
} from "@/lib/actions/rrhh-planilla";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import SubmitButton from "@/components/ui/SubmitButton";

function formatearMonto(monto: string | number | null): string {
  if (monto === null) return "S/ 0.00";
  return `S/ ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function PlanillaDetalleColaboradorPage({
  params,
}: {
  params: Promise<{ id: string; idDetalle: string }>;
}) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");
  const { id, idDetalle } = await params;
  const idPlanillaMensual = Number(id);
  const idPlanillaDetalle = Number(idDetalle);

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.ID_PLANILLA_MENSUAL !== idPlanillaMensual) notFound();

  const esPlanilla = detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const emitida = detalle.ESTADO_EMISION_CODIGO === "EMITIDA";
  const faltaPension = esPlanilla && !detalle.ID_SISTEMA_PENSION;
  const hoy = new Date().toISOString().slice(0, 10);
  const tieneSuspension = Boolean(detalle.SUSPENSION_RETENCION_4TA_HASTA && detalle.SUSPENSION_RETENCION_4TA_HASTA >= hoy);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/rrhh/planilla/${idPlanillaMensual}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          &larr; {detalle.PERIODO}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {detalle.NOMBRES} {detalle.APELLIDOS}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {detalle.CARGO} -- {esPlanilla ? "Boleta de pago (Planilla)" : `Recibo por honorarios (Locador -- ${detalle.TIPO_PAGO_LOCADOR_DESCRIPCION ?? "-"})`}
            </p>
          </div>
          {emitida ? (
            <div className="flex items-center gap-2">
              <a
                href={`/api/rrhh/planilla/${idPlanillaDetalle}/documento`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {esPlanilla ? "Ver boleta" : "Ver RxH"}
              </a>
              <form action={regenerarDocumentoDetalleAction}>
                <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
                <ConfirmSubmitButton
                  mensaje={`¿Regenerar ${esPlanilla ? "la boleta" : "el RxH"} con los datos y formato actuales? Se reemplaza el PDF ya emitido, sin cambiar montos ni estado.`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Regenerar {esPlanilla ? "boleta" : "RxH"}
                </ConfirmSubmitButton>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {faltaPension ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          A este colaborador le falta configurar su sistema de pension (AFP/ONP) en su ficha del directorio -- el aporte de
          pension quedo en S/ 0.00 y no se puede emitir la boleta hasta corregirlo.{" "}
          <Link href={`/rrhh/directorio/${detalle.ID_USUARIO}`} className="underline">
            Ir a su ficha
          </Link>
          .
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta={detalle.TIPO_DOCUMENTO_DESCRIPCION ?? "DNI"} valor={detalle.NRO_DOCUMENTO ?? "-"} />
          <Dato etiqueta="Cuenta de pago" valor={detalle.NRO_CUENTA ?? "-"} />
          <Dato etiqueta="CCI" valor={detalle.CCI ?? "-"} />
          <Dato etiqueta="Banco" valor={detalle.BANCO ?? "-"} />
          {esPlanilla ? (
            <Dato
              etiqueta="Sistema de pension"
              valor={
                detalle.SISTEMA_PENSION_DESCRIPCION
                  ? `${detalle.SISTEMA_PENSION_DESCRIPCION}${detalle.AFP_FONDO_DESCRIPCION ? ` (${detalle.AFP_FONDO_DESCRIPCION})` : ""}`
                  : "Sin configurar"
              }
            />
          ) : (
            <Dato
              etiqueta="Suspension retencion 4ta"
              valor={tieneSuspension ? `Vigente hasta ${formatearFecha(detalle.SUSPENSION_RETENCION_4TA_HASTA)}` : "No tiene / vencida"}
            />
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Detalle</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {detalle.ESTADO_EMISION_DESCRIPCION}
          </span>
        </div>

        {!emitida ? (
          <form action={actualizarMontosDetalleAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
            <Campo name="montoBruto" label="Monto bruto" defaultValue={detalle.MONTO_BRUTO} />
            {esPlanilla ? (
              <Campo name="montoAportePension" label="Aporte de pension" defaultValue={detalle.MONTO_APORTE_PENSION ?? "0"} />
            ) : null}
            <Campo
              name="montoRetencionRenta"
              label={esPlanilla ? "Retencion Renta 5ta" : "Retencion Renta 4ta"}
              defaultValue={detalle.MONTO_RETENCION_RENTA ?? "0"}
            />
            {esPlanilla ? <Campo name="montoEssalud" label="EsSalud (informativo)" defaultValue={detalle.MONTO_ESSALUD ?? "0"} /> : null}
            <div className="flex items-end gap-2 sm:col-span-2">
              <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
                Guardar montos
              </SubmitButton>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Neto = Bruto - Aporte de pension - Retencion (se recalcula solo al guardar).
              </p>
            </div>
          </form>
        ) : null}

        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-2">
          <Dato etiqueta="Bruto" valor={formatearMonto(detalle.MONTO_BRUTO)} />
          {esPlanilla ? <Dato etiqueta="Aporte de pension" valor={formatearMonto(detalle.MONTO_APORTE_PENSION)} /> : null}
          <Dato etiqueta={esPlanilla ? "Retencion Renta 5ta" : "Retencion Renta 4ta"} valor={formatearMonto(detalle.MONTO_RETENCION_RENTA)} />
          {esPlanilla ? <Dato etiqueta="EsSalud (costo empleador, no afecta el neto)" valor={formatearMonto(detalle.MONTO_ESSALUD)} /> : null}
          <Dato etiqueta="NETO A PAGAR" valor={formatearMonto(detalle.MONTO_NETO)} />
          <Dato etiqueta="Calculo" valor={detalle.CALCULO_AUTOMATICO ? "Automatico" : "Editado manualmente"} />
        </dl>

        {!emitida ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <form action={recalcularDetalleAction}>
              <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
              <SubmitButton
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                pendingText="Recalculando..."
              >
                Recalcular con tasas vigentes
              </SubmitButton>
            </form>
            {!faltaPension ? (
              <form action={emitirDetalleAction}>
                <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
                <ConfirmSubmitButton
                  mensaje={`¿Emitir ${esPlanilla ? "la boleta de pago" : "el recibo por honorarios"}? Ya no se podran editar los montos.`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Emitir
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Aportes (AFP/EsSalud) a SUNAT</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Independiente de si ya se pago el neto al colaborador -- marca cuando la empresa ya remitio estos aportes.
        </p>
        <form action={marcarPagadoDetalleAction} className="mt-3">
          <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
          <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
          <input type="hidden" name="pagado" value={detalle.AFP_ESSALUD_PAGADO ? "0" : "1"} />
          <SubmitButton
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              detalle.AFP_ESSALUD_PAGADO
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {detalle.AFP_ESSALUD_PAGADO ? "Pagado" : "Marcar como pagado"}
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{valor}</dd>
    </div>
  );
}

function Campo({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
