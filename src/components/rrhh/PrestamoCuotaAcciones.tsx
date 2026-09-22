"use client";

import { useState } from "react";
import { actualizarCuotaPrestamoAction, eliminarCuotaPrestamoAction } from "@/lib/actions/rrhh-prestamos";
import type { PrestamoCuotaRow } from "@/types/db";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import SubmitButton from "@/components/ui/SubmitButton";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

// Editar/quitar una cuota que todavia no tomo ninguna planilla (el
// llamador solo lo muestra en ese caso). Cualquier cambio la marca como
// "personalizada".
export default function PrestamoCuotaAcciones({ cuota, idPrestamo }: { cuota: PrestamoCuotaRow; idPrestamo: number }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Editar
        </button>
        <form action={eliminarCuotaPrestamoAction}>
          <input type="hidden" name="idPrestamo" value={idPrestamo} />
          <input type="hidden" name="idCuota" value={cuota.ID_CUOTA} />
          <ConfirmSubmitButton
            mensaje="¿Quitar esta cuota del cronograma?"
            pendingText="Quitando..."
            title="Quitar"
            className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            ×
          </ConfirmSubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form action={actualizarCuotaPrestamoAction} className="flex flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="idPrestamo" value={idPrestamo} />
      <input type="hidden" name="idCuota" value={cuota.ID_CUOTA} />
      <select
        name="mes"
        defaultValue={cuota.MES}
        className="rounded-lg border border-slate-300 px-1 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        {MESES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <input
        type="number"
        name="anio"
        min="2000"
        required
        defaultValue={cuota.ANIO}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <input
        type="number"
        step="0.01"
        min="0.01"
        name="monto"
        required
        defaultValue={cuota.MONTO}
        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <SubmitButton className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
        Guardar
      </SubmitButton>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
    </form>
  );
}
