"use client";

import { useState } from "react";
import { actualizarInstanciaAction } from "@/lib/actions/pago-recurrente";
import type { CuentaListadoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

interface EditarInstanciaPagoRecurrenteFilaProps {
  idPagoRecurrente: number;
  idInstancia: number;
  monto: string;
  idCuentaActual: number | null;
  cuentas: CuentaListadoRow[];
  puedeEditar: boolean;
}

// Unico mecanismo para cargar el monto real de una instancia ES_VARIABLE
// (generada con MONTO=0 como placeholder) -- tambien sirve para corregir
// un monto fijo puntual. Solo disponible mientras la instancia sigue sin
// pagar ni financiar (puedeEditar, calculado en la pagina).
export default function EditarInstanciaPagoRecurrenteFila({
  idPagoRecurrente,
  idInstancia,
  monto,
  idCuentaActual,
  cuentas,
  puedeEditar,
}: EditarInstanciaPagoRecurrenteFilaProps) {
  const [abierto, setAbierto] = useState(false);

  if (!puedeEditar) return null;

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Editar monto
      </button>
    );
  }

  return (
    <form action={actualizarInstanciaAction} className="flex flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="idPagoRecurrente" value={idPagoRecurrente} />
      <input type="hidden" name="idInstancia" value={idInstancia} />
      <input
        type="number"
        step="0.01"
        name="monto"
        required
        defaultValue={monto}
        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <div className="w-32">
        <ComboBusqueda
          name="idCuentaPago"
          placeholder="-- cuenta --"
          defaultValue={idCuentaActual ? String(idCuentaActual) : ""}
          opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
        />
      </div>
      <SubmitButton className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
        Guardar
      </SubmitButton>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
    </form>
  );
}
