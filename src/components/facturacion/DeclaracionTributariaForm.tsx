"use client";

import { useActionState } from "react";
import { actualizarDeclaracionAction, type ActualizarDeclaracionState } from "@/lib/actions/declaraciones-tributarias";
import type { DeclaracionTributariaDetalleRow } from "@/types/db";
import SubmitButton from "@/components/ui/SubmitButton";
import NotaAyuda from "@/components/ui/NotaAyuda";

const ESTADO_INICIAL: ActualizarDeclaracionState = { ok: false };

function Campo({
  name,
  label,
  type = "number",
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        required={required}
        defaultValue={defaultValue ?? undefined}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}

// Los campos que se muestran dependen del tipo -- IGV_RENTA_MENSUAL
// (ventas/compras/IGV/pago a cuenta renta) vs DJ_ANUAL_RENTA (impuesto
// calculado/pagos a cuenta acumulados/saldo). MONTO_TOTAL_A_PAGAR es
// siempre editable a mano (no se calcula solo): el usuario ya hizo la
// cuenta real en el PDT/formulario de SUNAT, esto solo registra el
// resultado para hacerle seguimiento al pago y al saldo a favor.
export default function DeclaracionTributariaForm({ declaracion }: { declaracion: DeclaracionTributariaDetalleRow }) {
  const [state, formAction] = useActionState(actualizarDeclaracionAction, ESTADO_INICIAL);
  const esMensual = declaracion.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL";

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <input type="hidden" name="idDeclaracion" value={declaracion.ID_DECLARACION} />

      <Campo name="fechaVencimiento" label="Fecha de vencimiento" type="date" required defaultValue={declaracion.FECHA_VENCIMIENTO} />

      {esMensual ? (
        <>
          <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">IGV</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="ventasGravadas" label="Ventas gravadas" defaultValue={declaracion.VENTAS_GRAVADAS} />
            <Campo name="comprasGravadas" label="Compras gravadas" defaultValue={declaracion.COMPRAS_GRAVADAS} />
            <Campo name="igvVentas" label="IGV ventas" defaultValue={declaracion.IGV_VENTAS} />
            <Campo name="igvCompras" label="IGV compras" defaultValue={declaracion.IGV_COMPRAS} />
          </div>
          <Campo name="igvResultante" label="IGV resultante (positivo = a pagar, negativo = saldo a favor)" defaultValue={declaracion.IGV_RESULTANTE} />
          <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Renta (pago a cuenta mensual)</h3>
          <Campo name="pagoACuentaRenta" label="Pago a cuenta de Renta" defaultValue={declaracion.PAGO_A_CUENTA_RENTA} />
        </>
      ) : (
        <>
          <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Renta anual</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="impuestoCalculadoRenta" label="Impuesto calculado" defaultValue={declaracion.IMPUESTO_CALCULADO_RENTA} />
            <Campo name="pagosACuentaAcumulados" label="Pagos a cuenta acumulados del año" defaultValue={declaracion.PAGOS_A_CUENTA_ACUMULADOS} />
          </div>
          <Campo name="saldoRenta" label="Saldo (positivo = por regularizar, negativo = a favor)" defaultValue={declaracion.SALDO_RENTA} />
        </>
      )}

      <Campo name="montoTotalAPagar" label="Monto total a pagar (0 si todo quedo a favor)" required defaultValue={declaracion.MONTO_TOTAL_A_PAGAR} />
      <NotaAyuda>Este monto es el que se usara despues para registrar el pago -- ingresa el resultado final tal como lo calculaste en el PDT/formulario de SUNAT.</NotaAyuda>

      <div>
        <label htmlFor="notas" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Notas (opcional)
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          defaultValue={declaracion.NOTAS ?? ""}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">{state.error}</p> : null}
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Guardado.</p> : null}

      <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
        Guardar
      </SubmitButton>
    </form>
  );
}
