"use client";

import { crearProyectoAction } from "@/lib/actions/proyectos";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { ClienteListadoRow } from "@/types/db";
import SelectorClienteProyecto from "./SelectorClienteProyecto";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

interface NuevoProyectoFormProps {
  tiposProyecto: MaestroRow[];
  monedas: MaestroRow[];
  clientes: ClienteListadoRow[];
}

export default function NuevoProyectoForm({ tiposProyecto, monedas, clientes }: NuevoProyectoFormProps) {
  return (
    <form
      action={crearProyectoAction}
      className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
        <ComboBusqueda
          name="idTipoProyecto"
          placeholder="-- selecciona --"
          opciones={tiposProyecto.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
        />
      </div>

      <Campo name="nombre" label="Nombre" placeholder="Ej. Instalacion CCTV - Cliente ABC" />
      <SelectorClienteProyecto clientes={clientes} />
      <Campo name="descripcion" label="Descripcion (opcional)" required={false} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="fechaInicio" label="Fecha de inicio" type="date" />
        <Campo name="fechaFinEstimada" label="Fecha de fin estimada (opcional)" type="date" required={false} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="costoPresupuestado" label="Costo presupuestado" type="number" />
        <Campo name="ingresoEsperado" label="Ingreso esperado" type="number" />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
        <ComboBusqueda
          name="idMoneda"
          placeholder="-- selecciona --"
          opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
        />
      </div>

      <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Creando...">
        Crear proyecto
      </SubmitButton>
    </form>
  );
}

function Campo({
  name,
  label,
  type = "text",
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        step={type === "number" ? "0.01" : undefined}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
