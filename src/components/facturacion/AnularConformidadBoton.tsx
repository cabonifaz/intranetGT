"use client";

import { useState } from "react";
import { anularConformidadAction } from "@/lib/actions/proyecto-conformidad";
import SubmitButton from "@/components/ui/SubmitButton";

// Copia 1:1 del patron de AnularPrestamoBoton.tsx. Nunca se puede
// anular una conformidad FIRMADA (guard en el SP), este boton solo
// aparece en BORRADOR/EMITIDA (ver la pagina de detalle).
export default function AnularConformidadBoton({ idConformidad, idProyecto }: { idConformidad: number; idProyecto: number }) {
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
      action={anularConformidadAction}
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        if (!window.confirm("¿Anular esta conformidad?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="idConformidad" value={idConformidad} />
      <input type="hidden" name="idProyecto" value={idProyecto} />
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
