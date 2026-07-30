"use client";

import { crearClienteAction } from "@/lib/actions/proyectos";

export default function NuevoClienteForm() {
  return (
    <form
      action={crearClienteAction}
      className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <Campo name="razonSocial" label="Razon social" placeholder="Ej. Cliente ABC S.A.C." />
      <Campo name="ruc" label="RUC (opcional)" required={false} />
      <Campo name="nombreContacto" label="Nombre de contacto (opcional)" required={false} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="telefono" label="Telefono (opcional)" required={false} />
        <Campo name="correo" label="Correo (opcional)" type="email" required={false} />
      </div>

      <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Crear cliente
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
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
