"use client";

import { useState } from "react";
import { anularPasivoAction } from "@/lib/actions/pasivos";

interface AnularPasivoBotonProps {
  idPasivo: number;
  idProyecto: number | null;
}

export default function AnularPasivoBoton({ idPasivo, idProyecto }: AnularPasivoBotonProps) {
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
      action={anularPasivoAction}
      className="flex flex-wrap items-center justify-end gap-1.5"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "¿Anular este pasivo? Solo se puede si ninguna cuota fue pagada todavia. Sus cuotas pendientes/protestadas tambien se anularan.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="idPasivo" value={idPasivo} />
      {idProyecto ? <input type="hidden" name="idProyecto" value={idProyecto} /> : null}
      <input
        type="text"
        name="motivo"
        required
        placeholder="Motivo de la anulacion"
        className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <button type="submit" className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
        Confirmar
      </button>
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
