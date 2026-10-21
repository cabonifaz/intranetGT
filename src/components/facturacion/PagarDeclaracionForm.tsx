"use client";

import { useActionState } from "react";
import { pagarDeclaracionAction, type PagarDeclaracionState } from "@/lib/actions/declaraciones-tributarias";
import type { CuentaListadoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

const ESTADO_INICIAL: PagarDeclaracionState = { ok: false };

export default function PagarDeclaracionForm({ idDeclaracion, cuentasBancarias }: { idDeclaracion: number; cuentasBancarias: CuentaListadoRow[] }) {
  const [state, formAction] = useActionState(pagarDeclaracionAction, ESTADO_INICIAL);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="idDeclaracion" value={idDeclaracion} />
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de pago</label>
        <ComboBusqueda
          name="idCuenta"
          placeholder="-- selecciona --"
          opciones={cuentasBancarias.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
        />
      </div>
      <div>
        <label htmlFor="fechaPago" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Fecha de pago
        </label>
        <input
          id="fechaPago"
          name="fechaPago"
          type="date"
          required
          defaultValue={hoy}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">{state.error}</p> : null}
      <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Registrando...">
        Registrar pago
      </SubmitButton>
    </form>
  );
}
