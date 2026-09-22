"use client";

import { useState } from "react";
import { solicitarPrestamoAction } from "@/lib/actions/rrhh-prestamos";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { EmpleadoDirectorioRow, DirectorioContactoConTipoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import NotaAyuda from "@/components/ui/NotaAyuda";
import SubmitButton from "@/components/ui/SubmitButton";
import SelectorBeneficiarioPrestamo from "@/components/rrhh/SelectorBeneficiarioPrestamo";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

interface SueldoFijoPropio {
  montoMaximo: number;
  monedaCodigo: string;
  idMoneda: number;
}

interface SolicitarPrestamoFormProps {
  tipos: MaestroRow[];
  monedas: MaestroRow[];
  colaboradores: EmpleadoDirectorioRow[];
  contactos: DirectorioContactoConTipoRow[];
  puedeGestionar: boolean;
  idUsuarioSesion: number;
  // Sueldo fijo vigente de quien esta en sesion (null si no tiene --
  // locador por hora, o sin contrato firmado) -- usado para mostrar el
  // tope real de un adelanto en el caso comun (solicitar para uno mismo).
  // Si quien gestiona cambia el beneficiario a otro trabajador o a un
  // contacto, este tope deja de aplicar y se valida recien al enviar.
  sueldoFijoPropio: SueldoFijoPropio | null;
  anioActual: number;
  mesActual: number;
}

function formatearMonto(monto: number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Autoservicio -- lo llena el propio colaborador para si mismo (no elige
// a quien, eso lo fija la sesion en el server action). Un PRESTAMO pide
// de una vez moneda, monto, N de cuotas y mes/anio de inicio del
// cronograma (RRHH parte de eso al otorgar, pudiendo ajustarlo). Un
// ADELANTO_SUELDO no pide cronograma (una sola cuota) y esta limitado al
// 70% del sueldo fijo del beneficiario, en la misma moneda de su sueldo.
// Quien puede gestionar prestamos ve ademas el selector de beneficiario
// (preseleccionado en si mismo), para solicitar en nombre de un
// trabajador o un contacto -- un adelanto nunca es para un contacto.
export default function SolicitarPrestamoForm({
  tipos,
  monedas,
  colaboradores,
  contactos,
  puedeGestionar,
  idUsuarioSesion,
  sueldoFijoPropio,
  anioActual,
  mesActual,
}: SolicitarPrestamoFormProps) {
  const idTipoPrestamoNormal = tipos.find((t) => t.CODIGO === "PRESTAMO") ? String(tipos.find((t) => t.CODIGO === "PRESTAMO")!.ID_MAESTRO) : "";
  const [idTipo, setIdTipo] = useState<string>(idTipoPrestamoNormal);
  const [idMoneda, setIdMoneda] = useState<string>("");
  const [monto, setMonto] = useState("");
  const [nroCuotas, setNroCuotas] = useState("6");
  const [anioInicio, setAnioInicio] = useState(String(anioActual));
  const [mesInicio, setMesInicio] = useState(String(mesActual));
  // Sin selector (autoservicio puro) el beneficiario siempre es uno
  // mismo, un trabajador.
  const [fuenteBeneficiario, setFuenteBeneficiario] = useState<"trabajador" | "contacto">("trabajador");

  const esAdelanto = tipos.find((t) => String(t.ID_MAESTRO) === idTipo)?.CODIGO === "ADELANTO_SUELDO";
  const nombreTipo = esAdelanto ? "adelanto" : "préstamo";

  // Un adelanto nunca es para un contacto, y en autoservicio puro (sin
  // selector de beneficiario) tampoco tiene sentido ofrecerlo si quien
  // esta en sesion no tiene un sueldo fijo que adelantar.
  const sinAdelantoDisponible = fuenteBeneficiario === "contacto" || (!puedeGestionar && !sueldoFijoPropio);
  const tiposDisponibles = sinAdelantoDisponible ? tipos.filter((t) => t.CODIGO !== "ADELANTO_SUELDO") : tipos;

  // El tope en vivo solo se muestra en el autoservicio puro (garantiza
  // que el beneficiario es quien esta en sesion). Quien gestiona
  // prestamos puede cambiar de beneficiario en el selector sin que este
  // formulario sepa a quien quedo eligiendo -- para ese caso se avisa
  // que el tope se valida recien al enviar, contra el sueldo real de esa
  // persona.
  const mostrarTopePropio = esAdelanto && !puedeGestionar;
  const montoNum = Number(monto);

  return (
    <form action={solicitarPrestamoAction} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {puedeGestionar ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Beneficiario</label>
          <SelectorBeneficiarioPrestamo
            colaboradores={colaboradores}
            contactos={contactos}
            defaultIdUsuario={idUsuarioSesion}
            onFuenteChange={(fuente) => {
              setFuenteBeneficiario(fuente);
              if (fuente === "contacto" && esAdelanto) setIdTipo(idTipoPrestamoNormal);
            }}
          />
          <NotaAyuda>Viene preseleccionado en ti mismo -- cámbialo si la solicitud es para un trabajador o un contacto del directorio.</NotaAyuda>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
        <ComboBusqueda
          key={fuenteBeneficiario}
          name="idTipoPrestamo"
          defaultValue={idTipo}
          opciones={tiposDisponibles.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          onSeleccionar={setIdTipo}
        />
        {esAdelanto ? (
          mostrarTopePropio && sueldoFijoPropio ? (
            <NotaAyuda>
              Puedes solicitar hasta {formatearMonto(sueldoFijoPropio.montoMaximo, sueldoFijoPropio.monedaCodigo)} (70% de tu sueldo fijo),
              en la misma moneda de tu sueldo.
            </NotaAyuda>
          ) : (
            <NotaAyuda>El tope del 70% se valida contra el sueldo fijo vigente del trabajador que elijas.</NotaAyuda>
          )
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="montoTotal" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Monto solicitado
          </label>
          <input
            id="montoTotal"
            name="montoTotal"
            type="number"
            step="0.01"
            min="0.01"
            max={mostrarTopePropio && sueldoFijoPropio ? sueldoFijoPropio.montoMaximo : undefined}
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {mostrarTopePropio && sueldoFijoPropio && montoNum > sueldoFijoPropio.montoMaximo ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Supera el tope del 70% de tu sueldo fijo.</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
          <ComboBusqueda
            key={esAdelanto ? "adelanto" : "prestamo"}
            name="idMoneda"
            placeholder="-- selecciona --"
            defaultValue={mostrarTopePropio && sueldoFijoPropio ? String(sueldoFijoPropio.idMoneda) : idMoneda}
            opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
            onSeleccionar={setIdMoneda}
          />
          {esAdelanto ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Un adelanto va en la moneda de tu sueldo.</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="descripcion" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Motivo (opcional)
        </label>
        <input
          id="descripcion"
          name="descripcion"
          maxLength={300}
          placeholder="Ej. Gastos medicos"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {!esAdelanto ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cronograma que propones</p>
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
          <NotaAyuda>
            Es lo que propones -- RRHH, Administración o Gerencia lo revisa al otorgar y puede ajustarlo antes de generar el
            compromiso de pago.
          </NotaAyuda>
        </div>
      ) : null}

      <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Enviando...">
        Enviar solicitud
      </SubmitButton>
      <NotaAyuda className="justify-center">
        RRHH revisa tu solicitud de {nombreTipo} y define el cronograma de descuento. Te avisamos cuando este lista para firmar.
      </NotaAyuda>
    </form>
  );
}
