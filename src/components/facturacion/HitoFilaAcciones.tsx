"use client";

import { useState } from "react";
import {
  marcarHitoFacturadoAction,
  cobrarHitoProyectoAction,
  anularHitoProyectoAction,
  eliminarHitoProyectoAction,
} from "@/lib/actions/proyectos";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import type { ProyectoHitoRow } from "@/types/db";

interface HitoFilaAccionesProps {
  hito: ProyectoHitoRow;
  idProyecto: number;
  nombreProyecto: string;
}

export default function HitoFilaAcciones({ hito, idProyecto, nombreProyecto }: HitoFilaAccionesProps) {
  const [modo, setModo] = useState<"ninguno" | "facturar" | "cobrar">("ninguno");

  // El formulario inline queda "pegado" si no se cierra solo: React
  // reusa esta misma instancia entre renders (el key={h.ID_HITO} del
  // padre no cambia al confirmar), asi que el modo local sobrevive al
  // refresh() del servidor. Se cierra apenas el estado del hito que
  // llega del servidor cambia -- eso solo pasa cuando la mutacion ya se
  // aplico. Ajustar el state durante el render (no en un useEffect) es
  // el patron que React recomienda para "resetear al cambiar una prop".
  const [estadoPrevio, setEstadoPrevio] = useState(hito.ESTADO_HITO_CODIGO);
  if (hito.ESTADO_HITO_CODIGO !== estadoPrevio) {
    setEstadoPrevio(hito.ESTADO_HITO_CODIGO);
    setModo("ninguno");
  }

  const puedeFacturar = hito.ESTADO_HITO_CODIGO === "PLANEADO";
  const puedeCobrar = hito.ESTADO_HITO_CODIGO === "PLANEADO" || hito.ESTADO_HITO_CODIGO === "FACTURADO";
  const puedeAnular = hito.ESTADO_HITO_CODIGO === "PLANEADO";
  const puedeEliminar = hito.ESTADO_HITO_CODIGO === "PLANEADO";
  const hoy = new Date().toISOString().slice(0, 10);

  if (modo === "facturar") {
    return (
      <form action={marcarHitoFacturadoAction} className="flex flex-wrap items-center justify-end gap-1.5">
        <input type="hidden" name="idProyecto" value={idProyecto} />
        <input type="hidden" name="idHito" value={hito.ID_HITO} />
        <input
          type="text"
          name="nroFactura"
          placeholder="N° de factura (opcional)"
          className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <input
          type="date"
          name="fechaFacturado"
          required
          defaultValue={hoy}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button type="submit" className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
          Confirmar
        </button>
        <button type="button" onClick={() => setModo("ninguno")} className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          Cancelar
        </button>
      </form>
    );
  }

  if (modo === "cobrar") {
    return (
      <form action={cobrarHitoProyectoAction} className="flex flex-wrap items-center justify-end gap-1.5">
        <input type="hidden" name="idProyecto" value={idProyecto} />
        <input type="hidden" name="idHito" value={hito.ID_HITO} />
        <input type="hidden" name="concepto" value={`${hito.NOMBRE} - ${nombreProyecto}`} />
        <input
          type="date"
          name="fecha"
          required
          defaultValue={hoy}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <input
          type="number"
          step="0.01"
          name="monto"
          required
          defaultValue={hito.MONTO}
          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button type="submit" className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">
          Confirmar
        </button>
        <button type="button" onClick={() => setModo("ninguno")} className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {puedeFacturar ? (
        <button
          type="button"
          onClick={() => setModo("facturar")}
          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-400"
        >
          Marcar facturado
        </button>
      ) : null}
      {puedeCobrar ? (
        <button
          type="button"
          onClick={() => setModo("cobrar")}
          className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
        >
          Cobrar
        </button>
      ) : null}
      {puedeEliminar ? (
        <form action={eliminarHitoProyectoAction} className="inline-block">
          <input type="hidden" name="idProyecto" value={idProyecto} />
          <input type="hidden" name="idHito" value={hito.ID_HITO} />
          <ConfirmSubmitButton
            mensaje="¿Eliminar este item del plan de facturacion?"
            className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            Eliminar
          </ConfirmSubmitButton>
        </form>
      ) : null}
      {puedeAnular ? (
        <form action={anularHitoProyectoAction} className="inline-block">
          <input type="hidden" name="idProyecto" value={idProyecto} />
          <input type="hidden" name="idHito" value={hito.ID_HITO} />
          <ConfirmSubmitButton
            mensaje="¿Anular este item del plan de facturacion?"
            className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Anular
          </ConfirmSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
