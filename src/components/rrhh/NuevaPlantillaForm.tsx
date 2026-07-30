"use client";

import { useState } from "react";
import { crearPlantillaAction } from "@/lib/actions/rrhh";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { NOMBRES_TOKENS } from "@/lib/rrhh/plantilla-tokens";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface NuevaPlantillaFormProps {
  tiposContrato: MaestroRow[];
  tiposPagoLocador: MaestroRow[];
}

export default function NuevaPlantillaForm({ tiposContrato, tiposPagoLocador }: NuevaPlantillaFormProps) {
  const [idTipoContrato, setIdTipoContrato] = useState<number | "">("");
  const esLocador = tiposContrato.find((t) => t.ID_MAESTRO === idTipoContrato)?.CODIGO === "LOCADOR";

  return (
    <form
      action={crearPlantillaAction}
      className="mt-6 max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de contrato (regimen)</label>
        <ComboBusqueda
          name="idTipoContrato"
          placeholder="-- selecciona --"
          opciones={tiposContrato.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          onSeleccionar={(v) => setIdTipoContrato(v ? Number(v) : "")}
        />
      </div>

      {esLocador ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de pago del locador</label>
          <ComboBusqueda
            name="idTipoPagoLocador"
            placeholder="-- selecciona --"
            opciones={tiposPagoLocador.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          />
        </div>
      ) : null}

      <Campo name="nombre" label="Nombre de la plantilla" placeholder="Ej. Contrato de trabajo a tiempo completo" />
      <Campo name="tituloDocumento" label="Titulo del documento (encabezado del PDF)" placeholder="Ej. CONTRATO DE TRABAJO A TIEMPO COMPLETO" />

      <div>
        <label htmlFor="parrafoIntro" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Parrafo de identificacion de las partes
        </label>
        <textarea
          id="parrafoIntro"
          name="parrafoIntro"
          rows={5}
          required
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <TokensAyuda />

      <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Crear plantilla
      </button>
    </form>
  );
}

export function TokensAyuda() {
  return (
    <details className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">
        Placeholders disponibles ({"{{TOKEN}}"})
      </summary>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {NOMBRES_TOKENS.map((token) => (
          <code key={token} className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
            {`{{${token}}}`}
          </code>
        ))}
      </div>
    </details>
  );
}

function Campo({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
