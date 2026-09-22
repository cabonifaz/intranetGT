"use client";

import { useState } from "react";
import { crearPrestamoAction } from "@/lib/actions/rrhh-prestamos";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { CuentaListadoRow, EmpleadoDirectorioRow, DirectorioContactoConTipoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import NotaAyuda from "@/components/ui/NotaAyuda";
import SubmitButton from "@/components/ui/SubmitButton";
import SelectorBeneficiarioPrestamo from "@/components/rrhh/SelectorBeneficiarioPrestamo";
import { avanzarMes, generarCuotasIguales } from "@/lib/rrhh/planilla/cronograma-prestamo";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

interface NuevoPrestamoFormProps {
  tipos: MaestroRow[];
  colaboradores: EmpleadoDirectorioRow[];
  contactos: DirectorioContactoConTipoRow[];
  monedas: MaestroRow[];
  cuentas: CuentaListadoRow[];
  tcSugerido: string | null;
  anioActual: number;
  mesActual: number;
  hoy: string;
}

function formatear(monto: number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NuevoPrestamoForm({ tipos, colaboradores, contactos, monedas, cuentas, tcSugerido, anioActual, mesActual, hoy }: NuevoPrestamoFormProps) {
  const [idMoneda, setIdMoneda] = useState<string>(monedas.find((m) => m.CODIGO === "PEN") ? String(monedas.find((m) => m.CODIGO === "PEN")!.ID_MAESTRO) : "");
  const [idTipo, setIdTipo] = useState<string>(tipos.find((t) => t.CODIGO === "PRESTAMO") ? String(tipos.find((t) => t.CODIGO === "PRESTAMO")!.ID_MAESTRO) : "");
  const [monto, setMonto] = useState("");
  const [nroCuotas, setNroCuotas] = useState("6");
  const [anioInicio, setAnioInicio] = useState(String(anioActual));
  const [mesInicio, setMesInicio] = useState(String(mesActual));

  const esAdelanto = tipos.find((t) => String(t.ID_MAESTRO) === idTipo)?.CODIGO === "ADELANTO_SUELDO";
  const nombreTipo = esAdelanto ? "adelanto" : "préstamo";

  const monedaSel = monedas.find((m) => String(m.ID_MAESTRO) === idMoneda) ?? null;
  const enSoles = !monedaSel || monedaSel.CODIGO === "PEN";
  const codigoMoneda = monedaSel?.CODIGO ?? "PEN";

  const montoNum = Number(monto);
  const cuotasNum = Math.trunc(Number(nroCuotas));
  const vistaPrevia =
    montoNum > 0 && cuotasNum >= 1 && cuotasNum <= 120
      ? generarCuotasIguales(montoNum, cuotasNum, Number(anioInicio), Number(mesInicio))
      : null;
  const ultima = vistaPrevia ? avanzarMes(Number(anioInicio), Number(mesInicio), cuotasNum - 1) : null;

  const cuentasDeLaMoneda = cuentas.filter((c) => c.ID_MONEDA !== null && String(c.ID_MONEDA) === idMoneda);

  return (
    <form action={crearPrestamoAction} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
        <ComboBusqueda
          name="idTipoPrestamo"
          defaultValue={idTipo}
          opciones={tipos.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          onSeleccionar={(v) => {
            setIdTipo(v);
            if (tipos.find((t) => String(t.ID_MAESTRO) === v)?.CODIGO === "ADELANTO_SUELDO") setNroCuotas("1");
          }}
        />
        <NotaAyuda>
          <strong>Préstamo</strong>: dinero que se le presta al colaborador y devuelve en cuotas. <strong>Adelanto de sueldo</strong>:
          adelanto a cuenta de su remuneración (o de sus honorarios) -- vale para cualquier tipo de contrato, planilla o locador, y
          normalmente se descuenta en una sola cuota, en la planilla del mes.
        </NotaAyuda>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Beneficiario</label>
        <SelectorBeneficiarioPrestamo colaboradores={colaboradores} contactos={contactos} />
        <NotaAyuda>
          Un trabajador recibe el dinero y se le descuentan las cuotas en su planilla; un contacto del directorio no tiene planilla,
          su repago se marca a mano desde el detalle del préstamo.
        </NotaAyuda>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="montoTotal" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Monto del {nombreTipo}</label>
          <input
            id="montoTotal"
            name="montoTotal"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
          <ComboBusqueda
            name="idMoneda"
            placeholder="-- selecciona --"
            defaultValue={idMoneda}
            opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
            onSeleccionar={setIdMoneda}
          />
        </div>
      </div>

      {!enSoles ? (
        <div>
          <label htmlFor="tipoCambio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de cambio pactado (soles por US$ 1)</label>
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
          <NotaAyuda>
            La planilla se paga en soles: cada cuota en dólares se descuenta a este tipo de cambio, que queda escrito en el
            compromiso firmado y no cambia durante el préstamo. Sugerido: el TC de &quot;Préstamos&quot; vigente.
          </NotaAyuda>
        </div>
      ) : null}

      <div>
        <label htmlFor="descripcion" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Motivo / descripción (opcional)</label>
        <input
          id="descripcion"
          name="descripcion"
          maxLength={300}
          placeholder="Ej. Adelanto para compra de laptop"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="fechaOrigen" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Fecha de otorgamiento</label>
        <input
          id="fechaOrigen"
          name="fechaOrigen"
          type="date"
          required
          defaultValue={hoy}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:w-56 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cronograma de descuentos</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="nroCuotas" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">N° de cuotas</label>
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
            <label htmlFor="mesInicio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Primera cuota: mes</label>
            <select
              id="mesInicio"
              name="mesInicio"
              value={mesInicio}
              onChange={(e) => setMesInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="anioInicio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Año</label>
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
            {cuotasNum} cuota{cuotasNum === 1 ? "" : "s"} de {formatear(vistaPrevia[0].monto, codigoMoneda)}
            {vistaPrevia[vistaPrevia.length - 1].monto !== vistaPrevia[0].monto
              ? ` (la última de ${formatear(vistaPrevia[vistaPrevia.length - 1].monto, codigoMoneda)} por el redondeo)`
              : ""}
            , de {MESES[Number(mesInicio) - 1]} {anioInicio} a {MESES[ultima.mes - 1]} {ultima.anio}.
          </p>
        ) : null}
        <NotaAyuda>
          Se generan cuotas iguales, una por mes. Después, desde el detalle del préstamo, puedes editar cualquier cuota,
          quitarla o agregar cuotas extra (por ejemplo, con cargo a la gratificación de julio o diciembre).
        </NotaAyuda>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de desembolso (opcional)</label>
        <ComboBusqueda
          key={idMoneda}
          name="idCuentaDesembolso"
          placeholder="-- no registrar movimiento --"
          opciones={cuentasDeLaMoneda.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
        />
        <NotaAyuda>
          Si eliges una cuenta se registra un egreso por el monto total en esa cuenta. Solo aparecen cuentas en la misma
          moneda del préstamo.
        </NotaAyuda>
      </div>

      <SubmitButton
        disabled={colaboradores.length === 0 && contactos.length === 0}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        pendingText="Creando..."
      >
        Crear {nombreTipo}
      </SubmitButton>
      <NotaAyuda className="justify-center">
        Al crearlo queda &quot;Pendiente de firma&quot;: descarga el {esAdelanto ? "documento de solicitud" : "compromiso de pago"}, que lo firme el
        colaborador y súbelo firmado. Recién entonces las cuotas se descuentan en la planilla y la boleta/recibo las muestra.
      </NotaAyuda>
    </form>
  );
}
