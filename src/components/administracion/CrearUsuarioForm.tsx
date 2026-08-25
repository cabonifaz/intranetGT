"use client";

import { useActionState } from "react";
import { crearUsuarioAction, type CrearUsuarioState } from "@/lib/actions/administracion";
import SubmitButton from "@/components/ui/SubmitButton";

const ESTADO_INICIAL: CrearUsuarioState = { ok: false };

export default function CrearUsuarioForm() {
  const [estado, formAction] = useActionState(crearUsuarioAction, ESTADO_INICIAL);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Crear usuario</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        El usuario (login) y la clave temporal se generan automaticamente.
      </p>

      <form
        action={formAction}
        key={estado.usuarioGenerado ?? "form"}
        className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <Campo name="correo" label="Correo" type="email" />
        <Campo name="nombres" label="Nombres" />
        <Campo name="apellidos" label="Apellidos" />
        <SubmitButton
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          pendingText="Creando..."
        >
          Crear
        </SubmitButton>
      </form>

      {estado.error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {estado.error}
        </p>
      ) : null}

      {estado.ok && estado.usuarioGenerado ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">Usuario creado</p>
          <p className="mt-1 text-emerald-700 dark:text-emerald-400">
            Usuario: <span className="font-mono">{estado.usuarioGenerado}</span>
            <br />
            Clave temporal: <span className="font-mono">{estado.claveTemporal}</span>
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
            Compartela con la persona ahora — no se volvera a mostrar. Debera cambiarla al ingresar.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Campo({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
