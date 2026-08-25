"use client";

import { useState } from "react";
import { crearPagoRecurrenteAction } from "@/lib/actions/pago-recurrente";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { CuentaListadoRow } from "@/types/db";
import { ComboBusqueda, type OpcionCombo } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

interface NuevoPagoRecurrenteFormProps {
  monedas: MaestroRow[];
  cuentas: CuentaListadoRow[];
  proyectos: OpcionCombo[];
}

export default function NuevoPagoRecurrenteForm({ monedas, cuentas, proyectos }: NuevoPagoRecurrenteFormProps) {
  const [esVariable, setEsVariable] = useState(false);

  return (
    <form
      action={crearPagoRecurrenteAction}
      className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <Campo name="nombre" label="Nombre" placeholder="Ej. Alquiler oficina" />
      <Campo name="descripcion" label="Descripcion (opcional)" required={false} />

      <div className="flex items-center gap-2">
        <input
          id="esVariable"
          type="checkbox"
          name="esVariable"
          value="1"
          checked={esVariable}
          onChange={(e) => setEsVariable(e.target.checked)}
          className="rounded border-slate-300 dark:border-slate-700"
        />
        <label htmlFor="esVariable" className="text-sm text-slate-700 dark:text-slate-200">
          Monto variable (se carga a mano cada vez que toca, en vez de un monto fijo)
        </label>
      </div>

      {!esVariable ? <Campo name="montoFijo" label="Monto fijo" type="number" /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
          <ComboBusqueda
            name="idMoneda"
            placeholder="-- selecciona --"
            opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
          />
        </div>
        <Campo
          name="tipoCambio"
          label="TC (opcional)"
          type="number"
          step="0.0001"
          required={false}
          placeholder="Ej. 3.75"
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        El TC es obligatorio solo si eliges un proyecto y la moneda de este pago es distinta a la del proyecto.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cada cuantos meses</label>
          <input
            name="intervaloMeses"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">1 = mensual, 3 = trimestral, 12 = anual...</p>
        </div>
        <Campo name="diaVencimiento" label="Dia de vencimiento (1-31)" type="number" min={1} max={31} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="fechaInicio" label="Fecha de inicio" type="date" />
        <Campo name="fechaFin" label="Fecha de fin (opcional)" type="date" required={false} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Proyecto (opcional -- dejalo vacio si es administrativo/general o transversal a varios proyectos)
        </label>
        <ComboBusqueda name="idProyecto" placeholder="-- sin proyecto --" opciones={proyectos} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de pago por defecto (opcional)</label>
        <ComboBusqueda
          name="idCuentaPagoDefault"
          placeholder="-- sin definir --"
          opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Solo una sugerencia -- cada instancia generada puede pagarse con otra cuenta.
        </p>
      </div>

      <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Creando...">
        Crear pago recurrente
      </SubmitButton>
    </form>
  );
}

function Campo({
  name,
  label,
  type = "text",
  step,
  required = true,
  placeholder,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
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
        step={step ?? (type === "number" ? "0.01" : undefined)}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
