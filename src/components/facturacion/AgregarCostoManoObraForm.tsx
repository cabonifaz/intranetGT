"use client";

import { useState } from "react";
import { agregarCostoManoObraAction } from "@/lib/actions/proyectos";
import type { ContratoListadoRow, ProveedorListadoRow, ContratoPeriodoPagoRow, ContratoHorasTodosRow } from "@/types/db";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

interface AgregarCostoManoObraFormProps {
  idProyecto: number;
  contratos: ContratoListadoRow[];
  proveedoresPersonaNatural: ProveedorListadoRow[];
  periodosPorContrato: ContratoPeriodoPagoRow[];
  horasPorContrato: ContratoHorasTodosRow[];
  monedas: MaestroRow[];
  idMonedaProyecto: number;
  monedaProyectoCodigo: string;
  tcSugerido: string | null;
}

// La persona es exactamente una de dos fuentes (contrato de RRHH o
// proveedor persona natural) -- ver SelectorPersonaManoObra.tsx, cuya
// logica se junto aca porque ahora necesita comunicarse con los campos
// de periodo/monto: si el contrato elegido ya tiene periodos cargados,
// se puede elegir uno como punto de partida -- jala su PERIODO/MONTO,
// pero ambos siguen editables. Dos fuentes posibles de periodos, mutuamente
// excluyentes segun el tipo de contrato (nunca las dos a la vez para el
// mismo contrato): RRHH_CONTRATO_PERIODO_PAGO (PLANILLA/LOCADOR MENSUAL/
// POR_JORNADA/POR_PROYECTO) o RRHH_CONTRATO_HORAS (LOCADOR POR_HORA, que
// no genera periodos de pago -- sus "periodos" son horas cargadas por
// proyecto, con su propio monto ya calculado horas x tarifa).
export default function AgregarCostoManoObraForm({
  idProyecto,
  contratos,
  proveedoresPersonaNatural,
  periodosPorContrato,
  horasPorContrato,
  monedas,
  idMonedaProyecto,
  monedaProyectoCodigo,
  tcSugerido,
}: AgregarCostoManoObraFormProps) {
  const [fuente, setFuente] = useState<"contrato" | "proveedor">("contrato");
  const [idContrato, setIdContrato] = useState<number | "">("");
  const [periodo, setPeriodo] = useState("");
  const [monto, setMonto] = useState("");
  const [idMonedaDefault, setIdMonedaDefault] = useState(String(idMonedaProyecto));
  const [tipoCambioDefault, setTipoCambioDefault] = useState(tcSugerido ?? "");

  const periodosDelContrato = idContrato ? periodosPorContrato.filter((p) => p.ID_CONTRATO === idContrato) : [];
  const horasDelContrato = idContrato ? horasPorContrato.filter((h) => h.ID_CONTRATO === idContrato) : [];
  const idMonedaPEN = monedas.find((m) => m.CODIGO === "PEN")?.ID_MAESTRO;

  const opcionesSugerencia = [
    ...periodosDelContrato.map((p) => ({
      value: `pp-${p.ID_PERIODO_PAGO}`,
      label: `${p.PERIODO} - S/ ${p.MONTO}${p.ID_MOVIMIENTO ? " (pagado)" : p.FINANCIADO_CON_PASIVO ? " (financiado)" : ""}`,
    })),
    ...horasDelContrato.map((h) => ({
      value: `h-${h.ID_CONTRATO_HORAS}`,
      label: `${h.PERIODO}${h.NOMBRE_PROYECTO ? ` (${h.NOMBRE_PROYECTO})` : ""} - ${h.HORAS}h - ${h.MONEDA_CODIGO === "USD" ? "US$" : "S/"} ${h.MONTO_CALCULADO}${h.ID_MOVIMIENTO ? " (pagado)" : h.FINANCIADO_CON_PASIVO ? " (financiado)" : ""}`,
    })),
  ];

  // RRHH_CONTRATO_PERIODO_PAGO no tiene columna de moneda -- siempre esta
  // en soles (ver sp_rrhh_contrato_periodo_pago.sql), asi que un periodo
  // siempre fuerza el combo a PEN. RRHH_CONTRATO_HORAS si tiene moneda
  // propia por proyecto enlazado desde esta sesion (034_rrhh_contrato_moneda.sql)
  // -- ahi se jala la moneda/TC reales de la fila en vez de asumir soles.
  function elegirSugerencia(valor: string) {
    const [tipo, id] = valor.split("-");
    if (tipo === "pp") {
      const elegido = periodosDelContrato.find((p) => String(p.ID_PERIODO_PAGO) === id);
      if (!elegido) return;
      setPeriodo(elegido.PERIODO);
      setMonto(elegido.MONTO);
      if (idMonedaPEN) setIdMonedaDefault(String(idMonedaPEN));
      setTipoCambioDefault(tcSugerido ?? "");
    } else {
      const elegido = horasDelContrato.find((h) => String(h.ID_CONTRATO_HORAS) === id);
      if (!elegido) return;
      setPeriodo(elegido.PERIODO);
      setMonto(elegido.MONTO_CALCULADO);
      setIdMonedaDefault(String(elegido.ID_MONEDA));
      setTipoCambioDefault(elegido.ID_MONEDA === idMonedaProyecto ? "" : elegido.TIPO_CAMBIO ?? tcSugerido ?? "");
    }
  }

  return (
    <form action={agregarCostoManoObraAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="idProyecto" value={idProyecto} />

      <div className="sm:col-span-2 space-y-2">
        <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={fuente === "contrato"}
              onChange={() => setFuente("contrato")}
              className="border-slate-300 dark:border-slate-700"
            />
            Contrato de RRHH
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={fuente === "proveedor"}
              onChange={() => setFuente("proveedor")}
              className="border-slate-300 dark:border-slate-700"
            />
            Proveedor (persona natural)
          </label>
        </div>

        {fuente === "contrato" ? (
          <ComboBusqueda
            name="idContrato"
            placeholder="-- selecciona un contrato --"
            opciones={contratos.map((c) => ({ value: String(c.ID_CONTRATO), label: `${c.NOMBRES} ${c.APELLIDOS} - ${c.CARGO}` }))}
            onSeleccionar={(v) => setIdContrato(v ? Number(v) : "")}
          />
        ) : (
          <ComboBusqueda
            name="idProveedor"
            placeholder="-- selecciona un proveedor --"
            disabled={proveedoresPersonaNatural.length === 0}
            opciones={proveedoresPersonaNatural.map((p) => ({ value: String(p.ID_PROVEEDOR), label: p.RAZON_SOCIAL }))}
          />
        )}
        {fuente === "proveedor" && proveedoresPersonaNatural.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No hay proveedores marcados como persona natural todavia -- se marcan desde su ficha en Compras.
          </p>
        ) : null}
      </div>

      {fuente === "contrato" && opcionesSugerencia.length > 0 ? (
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Periodo/horas ya cargados en el contrato (opcional -- jala periodo y monto abajo, editable)
          </label>
          <ComboBusqueda
            name="periodoReferencia"
            placeholder="-- ninguno, cargar a mano --"
            opciones={opcionesSugerencia}
            onSeleccionar={(v) => (v ? elegirSugerencia(v) : null)}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="periodo" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Periodo
        </label>
        <input
          id="periodo"
          name="periodo"
          required
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Ej. Mayo 2026"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label htmlFor="monto" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Monto {opcionesSugerencia.length > 0 ? "(ajustalo si solo una parte aplica a este proyecto)" : ""}
        </label>
        <input
          id="monto"
          name="monto"
          type="number"
          step="0.01"
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
        <ComboBusqueda
          key={idMonedaDefault}
          name="idMoneda"
          defaultValue={idMonedaDefault}
          opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
          onSeleccionar={(v) => setIdMonedaDefault(v)}
        />
        {opcionesSugerencia.length > 0 ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Al elegir un periodo se pone en soles automaticamente (siempre estan en soles); al elegir horas se pone
            en la moneda con la que se cargaron -- cambialo si corresponde.
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="tipoCambio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Tipo de cambio (opcional)
        </label>
        <input
          key={tipoCambioDefault}
          id="tipoCambio"
          type="number"
          step="0.0001"
          name="tipoCambio"
          placeholder="Ej. 3.75"
          defaultValue={tipoCambioDefault || undefined}
          onChange={(e) => setTipoCambioDefault(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Precargado con el TC vigente de Costos laborales (editable) -- obligatorio solo si eliges una moneda
          distinta a la del proyecto ({monedaProyectoCodigo}).
        </p>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="concepto" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Concepto (opcional)
        </label>
        <input
          id="concepto"
          name="concepto"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
          Agregar
        </SubmitButton>
      </div>
    </form>
  );
}
