"use client";

import { useState } from "react";
import type { ClienteListadoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface SelectorClienteProyectoProps {
  clientes: ClienteListadoRow[];
  defaultEsInterno?: boolean;
  defaultIdCliente?: number | null;
}

export default function SelectorClienteProyecto({ clientes, defaultEsInterno = false, defaultIdCliente = null }: SelectorClienteProyectoProps) {
  const [esInterno, setEsInterno] = useState(defaultEsInterno);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          name="esInterno"
          value="1"
          checked={esInterno}
          onChange={(e) => setEsInterno(e.target.checked)}
          className="rounded border-slate-300 dark:border-slate-700"
        />
        Proyecto interno (GT)
      </label>

      {!esInterno ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cliente</label>
          <ComboBusqueda
            name="idCliente"
            placeholder="-- selecciona --"
            defaultValue={defaultIdCliente ? String(defaultIdCliente) : ""}
            opciones={clientes.map((c) => ({ value: String(c.ID_CLIENTE), label: c.RAZON_SOCIAL }))}
          />
        </div>
      ) : null}
    </div>
  );
}
