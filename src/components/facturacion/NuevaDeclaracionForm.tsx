"use client";

import { useState } from "react";
import { crearDeclaracionAction } from "@/lib/actions/declaraciones-tributarias";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import SubmitButton from "@/components/ui/SubmitButton";
import NotaAyuda from "@/components/ui/NotaAyuda";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

// El mes solo aplica a la mensual (IGV_RENTA_MENSUAL) -- la DJ anual se
// crea con MES=0 (ver UQ_DECLARACION_PERIODO, que necesita un valor fijo
// en vez de NULL para que el UNIQUE bloquee duplicados de verdad).
export default function NuevaDeclaracionForm({ tipos }: { tipos: MaestroRow[] }) {
  const [idTipoSeleccionado, setIdTipoSeleccionado] = useState(tipos[0]?.ID_MAESTRO ?? 0);
  const tipoSeleccionado = tipos.find((t) => t.ID_MAESTRO === idTipoSeleccionado);
  const esMensual = tipoSeleccionado?.CODIGO === "IGV_RENTA_MENSUAL";

  return (
    <form action={crearDeclaracionAction} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <label htmlFor="idTipoDeclaracion" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Tipo de declaracion
        </label>
        <select
          id="idTipoDeclaracion"
          name="idTipoDeclaracion"
          value={idTipoSeleccionado}
          onChange={(e) => setIdTipoSeleccionado(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {tipos.map((t) => (
            <option key={t.ID_MAESTRO} value={t.ID_MAESTRO}>
              {t.DESCRIPCION}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="anio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Año
          </label>
          <input
            id="anio"
            name="anio"
            type="number"
            required
            defaultValue={new Date().getFullYear()}
            min={2000}
            max={2100}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        {esMensual ? (
          <div>
            <label htmlFor="mes" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
              Mes
            </label>
            <select
              id="mes"
              name="mes"
              required
              defaultValue={new Date().getMonth() + 1}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {MESES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="fechaVencimiento" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Fecha de vencimiento (cronograma SUNAT segun ultimo digito de RUC)
        </label>
        <input
          id="fechaVencimiento"
          name="fechaVencimiento"
          type="date"
          required
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <NotaAyuda>
          Es el limite para presentar Y pagar segun el cronograma de SUNAT de ese año -- SUNAT lo cambia cada año, no se
          calcula solo, revisalo en su cronograma de obligaciones mensuales.
        </NotaAyuda>
      </div>

      <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Creando...">
        Crear declaracion
      </SubmitButton>
    </form>
  );
}
