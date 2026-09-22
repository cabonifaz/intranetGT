"use client";

import { useState } from "react";
import { otorgarPrestamoAction } from "@/lib/actions/rrhh-prestamos";
import type { CuentaListadoRow, PrestamoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import NotaAyuda from "@/components/ui/NotaAyuda";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import { avanzarMes, generarCuotasIguales } from "@/lib/rrhh/planilla/cronograma-prestamo";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

function formatear(monto: number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// RRHH completa lo que la solicitud no trae: fecha real de desembolso,
// TC (si no es soles), cuenta de desembolso, y el cronograma de cuotas
// -- mismo generador de cronograma que "Nuevo prestamo".
export default function OtorgarPrestamoForm({ prestamo, cuentas, tcSugerido, hoy }: { prestamo: PrestamoRow; cuentas: CuentaListadoRow[]; tcSugerido: string | null; hoy: string }) {
  const enSoles = prestamo.MONEDA_CODIGO === "PEN";
  const hoyDate = new Date(hoy);
  // Si el solicitante propuso un cronograma (siempre que pidio un
  // PRESTAMO, no un adelanto -- ver SP_RRHH_PRESTAMO_SOLICITAR), parte de
  // ahi -- RRHH igual puede ajustarlo antes de otorgar.
  const [nroCuotas, setNroCuotas] = useState(prestamo.NRO_CUOTAS_SOLICITADO ? String(prestamo.NRO_CUOTAS_SOLICITADO) : "6");
  const [anioInicio, setAnioInicio] = useState(prestamo.ANIO_INICIO_SOLICITADO ? String(prestamo.ANIO_INICIO_SOLICITADO) : String(hoyDate.getFullYear()));
  const [mesInicio, setMesInicio] = useState(prestamo.MES_INICIO_SOLICITADO ? String(prestamo.MES_INICIO_SOLICITADO) : String(hoyDate.getMonth() + 1));

  const cuotasNum = Math.trunc(Number(nroCuotas));
  const vistaPrevia =
    cuotasNum >= 1 && cuotasNum <= 120 ? generarCuotasIguales(Number(prestamo.MONTO_TOTAL), cuotasNum, Number(anioInicio), Number(mesInicio)) : null;
  const ultima = vistaPrevia ? avanzarMes(Number(anioInicio), Number(mesInicio), cuotasNum - 1) : null;

  const cuentasDeLaMoneda = cuentas.filter((c) => c.ID_MONEDA === prestamo.ID_MONEDA);

  return (
    <form action={otorgarPrestamoAction} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <input type="hidden" name="idPrestamo" value={prestamo.ID_PRESTAMO} />

      <div>
        <label htmlFor="fechaOrigen" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Fecha de otorgamiento (desembolso)
        </label>
        <input
          id="fechaOrigen"
          name="fechaOrigen"
          type="date"
          required
          defaultValue={hoy}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:w-56 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {!enSoles ? (
        <div>
          <label htmlFor="tipoCambio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Tipo de cambio pactado (soles por US$ 1)
          </label>
          <input
            id="tipoCambio"
            name="tipoCambio"
            type="number"
            step="0.0001"
            min="0.0001"
            required
            defaultValue={tcSugerido ?? ""}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:w-56 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cronograma de descuentos</p>
        {prestamo.NRO_CUOTAS_SOLICITADO ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Precargado con lo que propuso quien solicitó -- puedes ajustarlo antes de otorgar.
          </p>
        ) : null}
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="nroCuotas" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
              N° de cuotas
            </label>
            <input
              id="nroCuotas"
              name="nroCuotas"
              type="number"
              min="1"
              max="120"
              required
              value={nroCuotas}
              onChange={(e) => setNroCuotas(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="mesInicio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
              Primera cuota: mes
            </label>
            <select
              id="mesInicio"
              name="mesInicio"
              value={mesInicio}
              onChange={(e) => setMesInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="anioInicio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
              Año
            </label>
            <input
              id="anioInicio"
              name="anioInicio"
              type="number"
              min="2000"
              required
              value={anioInicio}
              onChange={(e) => setAnioInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
        {vistaPrevia && ultima ? (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            {cuotasNum} cuota{cuotasNum === 1 ? "" : "s"} de {formatear(vistaPrevia[0].monto, prestamo.MONEDA_CODIGO)}
            {vistaPrevia[vistaPrevia.length - 1].monto !== vistaPrevia[0].monto
              ? ` (la última de ${formatear(vistaPrevia[vistaPrevia.length - 1].monto, prestamo.MONEDA_CODIGO)} por el redondeo)`
              : ""}
            , de {MESES[Number(mesInicio) - 1]} {anioInicio} a {MESES[ultima.mes - 1]} {ultima.anio}.
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de desembolso (opcional)</label>
        <ComboBusqueda name="idCuentaDesembolso" placeholder="-- no registrar movimiento --" opciones={cuentasDeLaMoneda.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))} />
        <NotaAyuda>Si eliges una cuenta se registra un egreso por el monto total en esa cuenta.</NotaAyuda>
      </div>

      <ConfirmSubmitButton
        mensaje="¿Otorgar esta solicitud con el cronograma indicado? El colaborador podra descargar el compromiso de pago para firmarlo."
        pendingText="Otorgando..."
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Otorgar
      </ConfirmSubmitButton>
    </form>
  );
}
