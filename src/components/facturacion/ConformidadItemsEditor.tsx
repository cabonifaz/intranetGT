"use client";

import { useState } from "react";
import {
  agregarItemConformidadAction,
  actualizarItemConformidadAction,
  eliminarItemConformidadAction,
} from "@/lib/actions/proyecto-conformidad";
import SubmitButton from "@/components/ui/SubmitButton";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import type { ProyectoConformidadItemRow } from "@/types/db";

// Alta/edicion/baja de los items de una conformidad -- solo tiene efecto
// mientras sigue BORRADOR (el SP no-opea despues, ver
// SP_PROYECTO_CONFORMIDAD_ITEM_*). El padre (la pagina de detalle) ya
// decide si mostrar esto o no segun el estado.
export default function ConformidadItemsEditor({
  idConformidad,
  idProyecto,
  items,
}: {
  idConformidad: number;
  idProyecto: number;
  items: ProyectoConformidadItemRow[];
}) {
  const [idEditando, setIdEditando] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item) =>
          idEditando === item.ID_ITEM ? (
            <li key={item.ID_ITEM}>
              <form
                action={actualizarItemConformidadAction}
                className="flex flex-wrap items-center gap-2"
                onSubmit={() => setIdEditando(null)}
              >
                <input type="hidden" name="idItem" value={item.ID_ITEM} />
                <input type="hidden" name="idConformidad" value={idConformidad} />
                <input type="hidden" name="idProyecto" value={idProyecto} />
                <input
                  name="descripcion"
                  required
                  defaultValue={item.DESCRIPCION}
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
                  Guardar
                </SubmitButton>
                <button
                  type="button"
                  onClick={() => setIdEditando(null)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </form>
            </li>
          ) : (
            <li key={item.ID_ITEM} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span className="text-sm text-slate-700 dark:text-slate-200">{item.DESCRIPCION}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIdEditando(item.ID_ITEM)}
                  className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Editar
                </button>
                <form action={eliminarItemConformidadAction} className="inline-block">
                  <input type="hidden" name="idItem" value={item.ID_ITEM} />
                  <input type="hidden" name="idConformidad" value={idConformidad} />
                  <input type="hidden" name="idProyecto" value={idProyecto} />
                  <ConfirmSubmitButton
                    mensaje="¿Eliminar este item de la conformidad?"
                    className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    Eliminar
                  </ConfirmSubmitButton>
                </form>
              </div>
            </li>
          ),
        )}
        {items.length === 0 ? <p className="text-sm text-slate-400 dark:text-slate-500">Todavía no hay items.</p> : null}
      </ul>

      <form action={agregarItemConformidadAction} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <input type="hidden" name="idConformidad" value={idConformidad} />
        <input type="hidden" name="idProyecto" value={idProyecto} />
        <input
          name="descripcion"
          required
          placeholder="Ej. Entrega del módulo de reportes"
          className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
          Agregar item
        </SubmitButton>
      </form>
    </div>
  );
}
