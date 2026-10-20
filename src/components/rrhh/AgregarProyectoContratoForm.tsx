"use client";

import { useState } from "react";
import { agregarProyectoContratoAction } from "@/lib/actions/rrhh";
import type { ProyectoListadoRow } from "@/types/db";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";
import NotaAyuda from "@/components/ui/NotaAyuda";

interface AgregarProyectoContratoFormProps {
  idContrato: number;
  proyectosGlobales: ProyectoListadoRow[];
  monedas: MaestroRow[];
}

// Al elegir el proyecto, la moneda se precarga con la moneda propia de
// ESE proyecto (editable) -- evita el caso mas comun de caer en el no-op
// silencioso de SP_RRHH_CONTRATO_PROYECTO_AGREGAR (moneda distinta a la
// del proyecto sin TC), que antes quedaba sin ningun mensaje visible.
export default function AgregarProyectoContratoForm({ idContrato, proyectosGlobales, monedas }: AgregarProyectoContratoFormProps) {
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<ProyectoListadoRow | null>(null);
  const [idMonedaDefault, setIdMonedaDefault] = useState("");

  function alElegirProyecto(valor: string) {
    const proyecto = proyectosGlobales.find((pg) => String(pg.ID_PROYECTO) === valor) ?? null;
    setProyectoSeleccionado(proyecto);
    setIdMonedaDefault(proyecto ? String(proyecto.ID_MONEDA) : "");
  }

  return (
    <>
      <form action={agregarProyectoContratoAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="idContrato" value={idContrato} />
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Proyecto / servicio</label>
          <div className="w-56">
            <ComboBusqueda
              name="idProyecto"
              placeholder="-- selecciona --"
              opciones={proyectosGlobales.map((pg) => ({ value: String(pg.ID_PROYECTO), label: pg.NOMBRE }))}
              onSeleccionar={alElegirProyecto}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tarifa/hora</label>
          <input type="number" step="0.01" name="tarifaHora" required className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
          <div className="w-32">
            <ComboBusqueda
              key={idMonedaDefault}
              name="idMoneda"
              placeholder="-- selecciona --"
              defaultValue={idMonedaDefault || undefined}
              opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
              onSeleccionar={setIdMonedaDefault}
            />
          </div>
        </div>
        <div>
          <label htmlFor="tipoCambioProyecto" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            TC (opcional)
          </label>
          <input
            id="tipoCambioProyecto"
            type="number"
            step="0.0001"
            name="tipoCambio"
            placeholder="Ej. 3.75"
            className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
          Agregar proyecto
        </SubmitButton>
      </form>
      <NotaAyuda>
        La moneda se precarga con la del proyecto elegido ({proyectoSeleccionado?.MONEDA_CODIGO ?? "se elige al elegir el proyecto"}).
        El TC es obligatorio solo si cambias a una moneda distinta -- si falta, el proyecto no se agrega y no se avisa en
        pantalla, revisa este dato si no aparece en la lista de abajo.
      </NotaAyuda>
    </>
  );
}
