"use client";

import { useActionState, type FormEvent } from "react";
import { resetearClaveAction, type ResetearClaveState } from "@/lib/actions/administracion";

const ESTADO_INICIAL: ResetearClaveState = { ok: false };

export default function ResetearClaveButton({ idUsuario, usuario }: { idUsuario: number; usuario: string }) {
  const [estado, formAction, enviando] = useActionState(resetearClaveAction, ESTADO_INICIAL);

  function confirmarEnvio(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`¿Generar una nueva clave temporal para "${usuario}"? La clave actual dejara de funcionar.`)) {
      event.preventDefault();
    }
  }

  return (
    <div>
      <form action={formAction} onSubmit={confirmarEnvio}>
        <input type="hidden" name="idUsuario" value={idUsuario} />
        <button
          type="submit"
          disabled={enviando}
          className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-60 dark:text-blue-400"
        >
          {enviando ? "Generando..." : "Resetear clave"}
        </button>
      </form>

      {estado.error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{estado.error}</p> : null}

      {estado.ok && estado.claveTemporal ? (
        <div className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-mono text-emerald-700 dark:text-emerald-400">{estado.claveTemporal}</p>
          <p className="mt-0.5 text-emerald-600 dark:text-emerald-500">Comunicasela ahora, no se volvera a mostrar.</p>
        </div>
      ) : null}
    </div>
  );
}
