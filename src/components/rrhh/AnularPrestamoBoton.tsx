"use client";

import { useState } from "react";
import { anularPrestamoAction } from "@/lib/actions/rrhh-prestamos";
import SubmitButton from "@/components/ui/SubmitButton";

export default function AnularPrestamoBoton({ idPrestamo }: { idPrestamo: number }) {
  const [expandido, setExpandido] = useState(false);

  if (!expandido) {
    return (
      <button
        type="button"
        onClick={() => setExpandido(true)}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Anular
      </button>
    );
  }

  return (
    <form
      action={anularPrestamoAction}
      className="flex flex-wrap items-center justify-end gap-1.5"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "¿Anular este préstamo? Solo se puede si ninguna cuota fue tomada por una planilla. Sus cuotas pendientes se anularán y ya no se descontarán. El movimiento de desembolso, si lo hubo, no se revierte.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="idPrestamo" value={idPrestamo} />
      <input
        type="text"
        name="motivo"
        required
        placeholder="Motivo de la anulación"
        className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <SubmitButton className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Confirmar</SubmitButton>
      <button
        type="button"
        onClick={() => setExpandido(false)}
        className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
    </form>
  );
}
