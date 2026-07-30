"use client";

import { useState } from "react";
import { crearCuentaAction } from "@/lib/actions/cuentas";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface NuevaCuentaFormProps {
  tiposCuenta: MaestroRow[];
  bancos: MaestroRow[];
  monedas: MaestroRow[];
}

export default function NuevaCuentaForm({ tiposCuenta, bancos, monedas }: NuevaCuentaFormProps) {
  const [idTipoCuenta, setIdTipoCuenta] = useState<number | "">("");
  const tipoCuentaCodigo = tiposCuenta.find((t) => t.ID_MAESTRO === idTipoCuenta)?.CODIGO;
  const necesitaDatosBancarios = tipoCuentaCodigo === "BANCARIA" || tipoCuentaCodigo === "DETRACCIONES";

  return (
    <form
      action={crearCuentaAction}
      className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de cuenta</label>
        <ComboBusqueda
          name="idTipoCuenta"
          placeholder="-- selecciona --"
          opciones={tiposCuenta.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          onSeleccionar={(v) => setIdTipoCuenta(v ? Number(v) : "")}
        />
      </div>

      <Campo name="nombre" label="Nombre de la cuenta" placeholder="Ej. Cuenta corriente soles BCP" />

      {necesitaDatosBancarios ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Banco</label>
            <ComboBusqueda
              name="idBanco"
              placeholder="-- selecciona --"
              opciones={bancos.map((b) => ({ value: String(b.ID_MAESTRO), label: b.DESCRIPCION }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
            <ComboBusqueda
              name="idMoneda"
              placeholder="-- selecciona --"
              opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
            />
          </div>
          <Campo name="nroCuenta" label="N° de cuenta" required={false} />
          <Campo name="cci" label="CCI (opcional)" required={false} />
        </div>
      ) : null}

      <Campo name="saldoInicial" label="Saldo inicial" type="number" required={false} placeholder="0.00" />

      <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Crear cuenta
      </button>
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
