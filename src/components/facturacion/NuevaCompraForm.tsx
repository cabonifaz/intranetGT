"use client";

import { crearCompraAction } from "@/lib/actions/compras";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { ProveedorListadoRow, ProyectoListadoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface NuevaCompraFormProps {
  proveedores: ProveedorListadoRow[];
  monedas: MaestroRow[];
  proyectos: ProyectoListadoRow[];
  tcSugerido: string | null;
}

export default function NuevaCompraForm({ proveedores, monedas, proyectos, tcSugerido }: NuevaCompraFormProps) {
  return (
    <form
      action={crearCompraAction}
      className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Proveedor</label>
        <ComboBusqueda
          name="idProveedor"
          placeholder="-- selecciona --"
          opciones={proveedores.map((p) => ({ value: String(p.ID_PROVEEDOR), label: p.RAZON_SOCIAL }))}
        />
      </div>

      <Campo name="descripcion" label="Descripcion" placeholder="Ej. Compra de equipos de red" />
      <Campo name="nroDocumento" label="N° de factura/boleta (opcional)" required={false} />

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Proyecto (opcional)</label>
        <ComboBusqueda
          name="idProyecto"
          placeholder="-- sin vincular --"
          opciones={proyectos.map((p) => ({ value: String(p.ID_PROYECTO), label: p.NOMBRE }))}
        />
      </div>

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

      <div>
        <Campo
          name="tipoCambio"
          label="Tipo de cambio (opcional)"
          type="number"
          step="0.0001"
          required={false}
          placeholder="Ej. 3.75"
          defaultValue={tcSugerido ?? undefined}
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Precargado con el TC vigente de Compras (editable) -- obligatorio solo si eliges un proyecto y su moneda es
          distinta a la de esta compra, para convertir el monto al costeo del proyecto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="fechaCompra" label="Fecha de compra" type="date" />
        <Campo name="fechaVencimiento" label="Fecha de vencimiento (opcional)" type="date" required={false} />
      </div>

      <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Crear compra
      </button>
    </form>
  );
}

function Campo({
  name,
  label,
  type = "text",
  step,
  required = true,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
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
        step={step ?? (type === "number" ? "0.01" : undefined)}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
