"use client";

import { useActionState } from "react";
import { crearMaestroAction, type CrearMaestroState } from "@/lib/actions/administracion";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

const ESTADO_INICIAL: CrearMaestroState = { ok: false };

interface CrearMaestroFormProps {
  tipoActivo: string;
  esCiudad: boolean;
  paises: MaestroRow[];
}

// El padre pasa `key={tipoActivo}` al montar este componente (ver
// administracion/maestros/page.tsx) para forzar un remount al cambiar de
// pestaña de tipo -- sin eso, el defaultValue del input "Tipo de maestro"
// se quedaria pegado al tipo anterior (los inputs no controlados solo
// leen defaultValue en el primer render).
export default function CrearMaestroForm({ tipoActivo, esCiudad, paises }: CrearMaestroFormProps) {
  const [estado, formAction, enviando] = useActionState(crearMaestroAction, ESTADO_INICIAL);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Agregar valor</h2>
      {esCiudad ? (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          El codigo debe ser unico entre todas las ciudades, ej. PE_LIMA.
        </p>
      ) : null}
      <form
        action={formAction}
        key={estado.idMaestro ?? "form"}
        className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label htmlFor="tipoMaestro" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Tipo de maestro
          </label>
          <input
            id="tipoMaestro"
            name="tipoMaestro"
            type="text"
            defaultValue={tipoActivo}
            required
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <Campo name="codigo" label="Codigo" />
        <Campo name="descripcion" label="Descripcion" />
        {esCiudad ? (
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Pais (padre)</label>
            <ComboBusqueda
              name="idPadre"
              placeholder="Selecciona..."
              opciones={paises.map((p) => ({ value: String(p.ID_MAESTRO), label: p.DESCRIPCION }))}
            />
          </div>
        ) : null}
        <Campo name="orden" label="Orden" type="number" defaultValue="10" />
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {enviando ? "Agregando..." : "Agregar"}
        </button>
      </form>

      {estado.error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {estado.error}
        </p>
      ) : null}
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
