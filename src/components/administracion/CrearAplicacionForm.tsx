"use client";

import { useActionState } from "react";
import { crearAplicacionAction, type CrearAplicacionState } from "@/lib/actions/administracion";
import type { AreaRow } from "@/types/db";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

const ESTADO_INICIAL: CrearAplicacionState = { ok: false };

interface CrearAplicacionFormProps {
  areas: AreaRow[];
  tiposAplicacion: MaestroRow[];
}

export default function CrearAplicacionForm({ areas, tiposAplicacion }: CrearAplicacionFormProps) {
  const [estado, formAction, enviando] = useActionState(crearAplicacionAction, ESTADO_INICIAL);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Crear aplicacion</h2>
      <form
        action={formAction}
        key={estado.idAplicacion ?? "form"}
        className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <Campo name="codigo" label="Codigo (ej. RRHH_VACACIONES)" />
        <Campo name="nombre" label="Nombre" />
        <Campo name="descripcion" label="Descripcion" required={false} />
        <Campo name="icono" label="Icono (opcional)" required={false} />

        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
          <ComboBusqueda
            name="idTipoAplicacion"
            defaultValue={tiposAplicacion[0] ? String(tiposAplicacion[0].ID_MAESTRO) : ""}
            opciones={tiposAplicacion.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Area propietaria</label>
          <ComboBusqueda
            name="idAreaPropietaria"
            defaultValue={areas[0] ? String(areas[0].ID_AREA) : ""}
            opciones={areas.map((a) => ({ value: String(a.ID_AREA), label: a.NOMBRE }))}
          />
        </div>

        <Campo name="rutaInterna" label="Ruta interna (ej. /rrhh/vacaciones)" required={false} />
        <Campo name="urlExterna" label="URL externa (si aplica)" required={false} />

        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" name="requiereSso" className="h-3.5 w-3.5" />
          Requiere SSO (app externa, disponible en Fase 4)
        </label>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {enviando ? "Creando..." : "Crear aplicacion"}
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
  required = true,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
