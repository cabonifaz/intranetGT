"use client";

import { useActionState } from "react";
import { crearRolAction, type CrearRolState } from "@/lib/actions/administracion";
import type { AreaRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

const ESTADO_INICIAL: CrearRolState = { ok: false };

export default function CrearRolForm({ areas }: { areas: AreaRow[] }) {
  const [estado, formAction] = useActionState(crearRolAction, ESTADO_INICIAL);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Crear rol</h2>
      <form
        action={formAction}
        key={estado.idRol ?? "form"}
        className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Area</label>
          <ComboBusqueda
            name="idArea"
            defaultValue={areas[0] ? String(areas[0].ID_AREA) : ""}
            opciones={areas.map((a) => ({ value: String(a.ID_AREA), label: a.NOMBRE }))}
          />
        </div>
        <Campo name="codigo" label="Codigo (ej. LOGISTICA_JEFATURA)" />
        <Campo name="nombre" label="Nombre" />
        <Campo name="nivelJerarquico" label="Nivel jerarquico (menor = mas privilegio)" type="number" defaultValue="50" />
        <SubmitButton
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          pendingText="Creando..."
        >
          Crear rol
        </SubmitButton>
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
