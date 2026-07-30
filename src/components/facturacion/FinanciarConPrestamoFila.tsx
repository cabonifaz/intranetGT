"use client";

import { useState } from "react";
import { financiarConPrestamoAction } from "@/lib/actions/pasivos";
import type { ProveedorListadoRow, DirectorioContactoConTipoRow, EmpleadoDirectorioRow, CuentaListadoRow } from "@/types/db";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SelectorAcreedorPasivo from "@/components/facturacion/SelectorAcreedorPasivo";

interface FinanciarConPrestamoFilaProps {
  tipoReferencia: string;
  idReferencia: number;
  idProyecto: number | null;
  rutaOrigen: string;
  montoSugerido: string | number;
  idMonedaSugerida?: number | null;
  proveedorSugerido?: number | null;
  tcSugerido?: string | null;
  tiposPasivo: MaestroRow[];
  monedas: MaestroRow[];
  cuentas: CuentaListadoRow[];
  proveedores: ProveedorListadoRow[];
  contactos: DirectorioContactoConTipoRow[];
  personal: EmpleadoDirectorioRow[];
}

// El pasivo reemplaza el pago -- no se mueve caja, el pasivo nuevo ES el
// pago (ver financiarConPrestamoAction). Se usa en las 4 pantallas con
// pagos pendientes: compra, periodos de sueldo, horas de locador,
// asignacion manual de mano de obra.
export default function FinanciarConPrestamoFila({
  tipoReferencia,
  idReferencia,
  idProyecto,
  rutaOrigen,
  montoSugerido,
  idMonedaSugerida,
  proveedorSugerido,
  tcSugerido,
  tiposPasivo,
  monedas,
  cuentas,
  proveedores,
  contactos,
  personal,
}: FinanciarConPrestamoFilaProps) {
  const [abierto, setAbierto] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
      >
        Financiar con prestamo
      </button>
    );
  }

  return (
    <form
      action={financiarConPrestamoAction}
      className="mt-2 grid w-full grid-cols-1 gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20 sm:grid-cols-2"
    >
      <input type="hidden" name="tipoReferencia" value={tipoReferencia} />
      <input type="hidden" name="idReferencia" value={idReferencia} />
      {idProyecto ? <input type="hidden" name="idProyecto" value={idProyecto} /> : null}
      <input type="hidden" name="rutaOrigen" value={rutaOrigen} />

      <div className="sm:col-span-2">
        <SelectorAcreedorPasivo
          proveedores={proveedores}
          contactos={contactos}
          personal={personal}
          defaultIdProveedor={proveedorSugerido ?? null}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de pasivo</label>
        <ComboBusqueda
          name="idTipoPasivo"
          placeholder="-- selecciona --"
          opciones={tiposPasivo.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
        <ComboBusqueda
          name="idMoneda"
          placeholder="-- selecciona --"
          defaultValue={idMonedaSugerida ? String(idMonedaSugerida) : ""}
          opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
        />
      </div>
      {idProyecto ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de cambio (opcional)</label>
          <input
            type="number"
            step="0.0001"
            name="tipoCambio"
            placeholder="Ej. 3.75"
            defaultValue={tcSugerido ?? undefined}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Precargado con el TC vigente de Prestamos (editable) -- obligatorio solo si la moneda del prestamo es
            distinta a la del proyecto que financia.
          </p>
        </div>
      ) : null}
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Monto del prestamo</label>
        <input
          type="number"
          step="0.01"
          name="montoTotal"
          required
          defaultValue={montoSugerido}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Fecha de origen</label>
        <input
          type="date"
          name="fechaOrigen"
          required
          defaultValue={hoy}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Cuenta por defecto para las cuotas (opcional)
        </label>
        <ComboBusqueda
          name="idCuentaPago"
          placeholder="-- sin definir --"
          opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
        <button type="submit" className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700">
          Confirmar prestamo
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
