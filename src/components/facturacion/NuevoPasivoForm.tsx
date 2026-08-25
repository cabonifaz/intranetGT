"use client";

import { crearPasivoAction } from "@/lib/actions/pasivos";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { CuentaListadoRow, ProveedorListadoRow, DirectorioContactoConTipoRow, EmpleadoDirectorioRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SelectorAcreedorPasivo from "./SelectorAcreedorPasivo";
import SubmitButton from "@/components/ui/SubmitButton";

interface NuevoPasivoFormProps {
  tiposPasivo: MaestroRow[];
  monedas: MaestroRow[];
  cuentas: CuentaListadoRow[];
  proveedores: ProveedorListadoRow[];
  contactos: DirectorioContactoConTipoRow[];
  personal: EmpleadoDirectorioRow[];
}

export default function NuevoPasivoForm({ tiposPasivo, monedas, cuentas, proveedores, contactos, personal }: NuevoPasivoFormProps) {
  return (
    <form
      action={crearPasivoAction}
      className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
        <ComboBusqueda
          name="idTipoPasivo"
          placeholder="-- selecciona --"
          opciones={tiposPasivo.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Acreedor</label>
        <SelectorAcreedorPasivo proveedores={proveedores} contactos={contactos} personal={personal} />
      </div>
      <Campo name="descripcion" label="Descripcion (opcional)" required={false} />
      <Campo name="nroOperacion" label="N° de operacion/letra (opcional)" required={false} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="montoTotal" label="Monto total" type="number" />
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
          <ComboBusqueda
            name="idMoneda"
            placeholder="-- selecciona --"
            opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="tasaInteres" label="Tasa de interes % (opcional)" type="number" required={false} />
        <Campo name="fechaOrigen" label="Fecha de origen" type="date" />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de pago por defecto (opcional)</label>
        <ComboBusqueda
          name="idCuentaPago"
          placeholder="-- sin asignar --"
          opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
        />
      </div>

      <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Creando...">
        Crear pasivo
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
