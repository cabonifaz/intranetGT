"use client";

import { useState } from "react";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { ClienteListadoRow, ProveedorListadoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface SelectorTipoContactoProps {
  tiposRelacion: MaestroRow[];
  clientes: ClienteListadoRow[];
  proveedores: ProveedorListadoRow[];
}

export default function SelectorTipoContacto({ tiposRelacion, clientes, proveedores }: SelectorTipoContactoProps) {
  const [tipoCodigo, setTipoCodigo] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de relacion</label>
        <ComboBusqueda
          name="tipoRelacionCodigo"
          placeholder="-- selecciona --"
          opciones={tiposRelacion.map((t) => ({ value: t.CODIGO, label: t.DESCRIPCION }))}
          onSeleccionar={setTipoCodigo}
        />
      </div>

      {tipoCodigo === "CLIENTE" ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cliente</label>
          <ComboBusqueda
            name="idCliente"
            placeholder="-- selecciona --"
            opciones={clientes.map((c) => ({ value: String(c.ID_CLIENTE), label: c.RAZON_SOCIAL }))}
          />
        </div>
      ) : null}

      {tipoCodigo === "PROVEEDOR" ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Proveedor</label>
          <ComboBusqueda
            name="idProveedor"
            placeholder="-- selecciona --"
            opciones={proveedores.map((p) => ({ value: String(p.ID_PROVEEDOR), label: p.RAZON_SOCIAL }))}
          />
        </div>
      ) : null}

      {tipoCodigo === "SOCIO_COMERCIAL" || tipoCodigo === "OTRO" ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Empresa</label>
          <input
            name="empresaExterna"
            required
            placeholder="Nombre de la empresa"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      ) : null}
    </div>
  );
}
