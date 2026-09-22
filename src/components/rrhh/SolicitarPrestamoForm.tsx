"use client";

import { useState } from "react";
import { solicitarPrestamoAction } from "@/lib/actions/rrhh-prestamos";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import NotaAyuda from "@/components/ui/NotaAyuda";
import SubmitButton from "@/components/ui/SubmitButton";

// Autoservicio -- lo llena el propio colaborador para si mismo (no elige
// a quien, eso lo fija la sesion en el server action). Sin cronograma ni
// cuenta de desembolso: eso lo define RRHH al otorgar la solicitud.
export default function SolicitarPrestamoForm({ tipos, monedas }: { tipos: MaestroRow[]; monedas: MaestroRow[] }) {
  const [idTipo, setIdTipo] = useState<string>(tipos.find((t) => t.CODIGO === "PRESTAMO") ? String(tipos.find((t) => t.CODIGO === "PRESTAMO")!.ID_MAESTRO) : "");
  const esAdelanto = tipos.find((t) => String(t.ID_MAESTRO) === idTipo)?.CODIGO === "ADELANTO_SUELDO";
  const nombreTipo = esAdelanto ? "adelanto" : "préstamo";

  return (
    <form action={solicitarPrestamoAction} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
        <ComboBusqueda
          name="idTipoPrestamo"
          defaultValue={idTipo}
          opciones={tipos.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          onSeleccionar={setIdTipo}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="montoTotal" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Monto solicitado
          </label>
          <input
            id="montoTotal"
            name="montoTotal"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
          <ComboBusqueda name="idMoneda" placeholder="-- selecciona --" opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))} />
        </div>
      </div>

      <div>
        <label htmlFor="descripcion" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Motivo (opcional)
        </label>
        <input
          id="descripcion"
          name="descripcion"
          maxLength={300}
          placeholder="Ej. Gastos medicos"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Enviando...">
        Enviar solicitud
      </SubmitButton>
      <NotaAyuda className="justify-center">
        RRHH revisa tu solicitud de {nombreTipo} y define el cronograma de descuento. Te avisamos cuando este lista para firmar.
      </NotaAyuda>
    </form>
  );
}
