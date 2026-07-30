"use client";

import { useActionState } from "react";
import { crearAreaAction, type CrearAreaState } from "@/lib/actions/administracion";

const ESTADO_INICIAL: CrearAreaState = { ok: false };

export default function CrearAreaForm() {
  const [estado, formAction, enviando] = useActionState(crearAreaAction, ESTADO_INICIAL);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Crear area</h2>
      <form
        action={formAction}
        key={estado.idArea ?? "form"}
        className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <Campo name="codigo" label="Codigo (ej. LOGISTICA)" />
        <Campo name="nombre" label="Nombre" />
        <Campo name="orden" label="Orden" type="number" defaultValue="10" />
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {enviando ? "Creando..." : "Crear area"}
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
