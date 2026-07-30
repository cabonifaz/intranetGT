"use client";

import { useState } from "react";
import { actualizarPeriodoPagoAction } from "@/lib/actions/rrhh";
import type { ContratoPeriodoPagoRow } from "@/types/db";

interface EditarPeriodoPagoFilaProps {
  idContrato: number;
  periodo: ContratoPeriodoPagoRow;
}

export default function EditarPeriodoPagoFila({ idContrato, periodo }: EditarPeriodoPagoFilaProps) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        title="Editar"
      >
        Editar
      </button>
    );
  }

  return (
    <form action={actualizarPeriodoPagoAction} className="flex flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="idContrato" value={idContrato} />
      <input type="hidden" name="idPeriodoPago" value={periodo.ID_PERIODO_PAGO} />
      <input
        name="periodo"
        required
        defaultValue={periodo.PERIODO}
        className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <input
        type="number"
        step="0.01"
        name="monto"
        required
        defaultValue={periodo.MONTO}
        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <button type="submit" className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
        Guardar
      </button>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
    </form>
  );
}
