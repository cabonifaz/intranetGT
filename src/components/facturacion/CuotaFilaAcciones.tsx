"use client";

import { useState } from "react";
import { pagarCuotaAction, protestarCuotaAction, anularCuotaAction, eliminarCuotaAction } from "@/lib/actions/pasivos";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import SubmitButton from "@/components/ui/SubmitButton";
import type { CuentaListadoRow, PasivoCuotaRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface CuotaFilaAccionesProps {
  cuota: PasivoCuotaRow;
  idPasivo: number;
  acreedor: string;
  cuentas: CuentaListadoRow[];
}

export default function CuotaFilaAcciones({ cuota, idPasivo, acreedor, cuentas }: CuotaFilaAccionesProps) {
  const [modo, setModo] = useState<"ninguno" | "pagar" | "protestar">("ninguno");
  const puedePagar = cuota.ESTADO_CUOTA_CODIGO === "PENDIENTE" || cuota.ESTADO_CUOTA_CODIGO === "PROTESTADA";
  const puedeProtestar = cuota.ESTADO_CUOTA_CODIGO === "PENDIENTE";
  const puedeEliminar = cuota.ESTADO_CUOTA_CODIGO === "PENDIENTE";
  const puedeAnular = cuota.ESTADO_CUOTA_CODIGO === "PENDIENTE" || cuota.ESTADO_CUOTA_CODIGO === "PROTESTADA";
  const hoy = new Date().toISOString().slice(0, 10);

  if (modo === "pagar") {
    return (
      <form action={pagarCuotaAction} className="flex flex-wrap items-center justify-end gap-1.5">
        <input type="hidden" name="idPasivo" value={idPasivo} />
        <input type="hidden" name="idCuota" value={cuota.ID_CUOTA} />
        <input type="hidden" name="concepto" value={`Cuota ${cuota.NRO_CUOTA} - ${acreedor}`} />
        <div className="w-36">
          <ComboBusqueda
            name="idCuenta"
            placeholder="-- cuenta --"
            defaultValue={cuota.ID_CUENTA_PAGO ? String(cuota.ID_CUENTA_PAGO) : ""}
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
          defaultValue={cuota.MONTO}
          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <SubmitButton className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">
          Confirmar
        </SubmitButton>
        <button type="button" onClick={() => setModo("ninguno")} className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          Cancelar
        </button>
      </form>
    );
  }

  if (modo === "protestar") {
    return (
      <form action={protestarCuotaAction} className="flex flex-wrap items-center justify-end gap-1.5">
        <input type="hidden" name="idPasivo" value={idPasivo} />
        <input type="hidden" name="idCuota" value={cuota.ID_CUOTA} />
        <input
          type="text"
          name="motivo"
          required
          placeholder="Motivo del protesto"
          className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <input
          type="date"
          name="fechaProtesto"
          required
          defaultValue={hoy}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <SubmitButton className="rounded-full bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">
          Confirmar
        </SubmitButton>
        <button type="button" onClick={() => setModo("ninguno")} className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {puedePagar ? (
        <button
          type="button"
          onClick={() => setModo("pagar")}
          className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
        >
          Pagar
        </button>
      ) : null}
      {puedeProtestar ? (
        <button
          type="button"
          onClick={() => setModo("protestar")}
          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
        >
          Protestar
        </button>
      ) : null}
      {puedeEliminar ? (
        <form action={eliminarCuotaAction} className="inline-block">
          <input type="hidden" name="idPasivo" value={idPasivo} />
          <input type="hidden" name="idCuota" value={cuota.ID_CUOTA} />
          <ConfirmSubmitButton
            mensaje="¿Eliminar esta cuota?"
            className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            Eliminar
          </ConfirmSubmitButton>
        </form>
      ) : null}
      {puedeAnular ? (
        <form action={anularCuotaAction} className="inline-block">
          <input type="hidden" name="idPasivo" value={idPasivo} />
          <input type="hidden" name="idCuota" value={cuota.ID_CUOTA} />
          <ConfirmSubmitButton
            mensaje="¿Anular esta cuota? Se usa para condonaciones/castigos que no pasan por caja."
            className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Anular
          </ConfirmSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
