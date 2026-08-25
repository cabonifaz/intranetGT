"use client";

import { useState } from "react";
import { pagarPeriodoContratoAction } from "@/lib/actions/rrhh";
import type { CuentaListadoRow, ContratoPeriodoPagoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

interface PagarPeriodoContratoFilaProps {
  idContrato: number;
  periodo: ContratoPeriodoPagoRow;
  cuentas: CuentaListadoRow[];
}

export default function PagarPeriodoContratoFila({ idContrato, periodo, cuentas }: PagarPeriodoContratoFilaProps) {
  const [abierto, setAbierto] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  if (periodo.ID_MOVIMIENTO !== null) {
    return (
      <span className="text-xs text-emerald-600 dark:text-emerald-400">
        Pagado el {new Date(`${periodo.FECHA_PAGO}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" })}
      </span>
    );
  }

  if (periodo.FINANCIADO_CON_PASIVO) {
    return <span className="text-xs text-amber-600 dark:text-amber-400">Financiado con prestamo</span>;
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
      >
        Pagar
      </button>
    );
  }

  return (
    <form action={pagarPeriodoContratoAction} className="flex flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="idContrato" value={idContrato} />
      <input type="hidden" name="idPeriodoPago" value={periodo.ID_PERIODO_PAGO} />
      <input type="hidden" name="concepto" value={`Sueldo/honorario: ${periodo.PERIODO}`} />
      <div className="w-36">
        <ComboBusqueda
          name="idCuenta"
          placeholder="-- cuenta --"
          opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
        />
      </div>
      <input
        type="date"
        name="fechaPago"
        required
        defaultValue={hoy}
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <input
        type="number"
        step="0.01"
        name="monto"
        required
        defaultValue={periodo.MONTO}
        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      <SubmitButton className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">
        Confirmar
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
