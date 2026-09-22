"use client";

import { useState } from "react";
import { actualizarMaestroAction } from "@/lib/actions/administracion";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import SubmitButton from "@/components/ui/SubmitButton";

// Fila editable de un valor de maestro -- pensado sobre todo para
// maestros de tipo "parametro" (ej. PARAMETRO_PRESTAMO), donde
// DESCRIPCION guarda un valor administrable (no solo una etiqueta) y hay
// que poder cambiarlo sin tocar codigo. Mismo patron de "click para
// editar" que PrestamoCuotaAcciones.
export default function EditarMaestroFila({ valor }: { valor: MaestroRow }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Editar
      </button>
    );
  }

  return (
    <form action={actualizarMaestroAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="idMaestro" value={valor.ID_MAESTRO} />
      <input
        type="text"
        name="codigo"
        defaultValue={valor.CODIGO}
        required
        className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <input
        type="text"
        name="descripcion"
        defaultValue={valor.DESCRIPCION}
        required
        className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <input
        type="number"
        name="orden"
        defaultValue={valor.ORDEN}
        required
        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
