"use client";

import Link from "next/link";
import { useState } from "react";
import { crearContratoAction } from "@/lib/actions/rrhh";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { EmpleadoDirectorioRow } from "@/types/db";
import { claveRegimen } from "@/lib/rrhh/regimen";
import { tieneIdentidadCompleta } from "@/lib/rrhh/identidad";
import { ComboBusqueda, type OpcionCombo } from "@/components/ui/ComboBusqueda";
import { SelectorPaisCiudad } from "./SelectorPaisCiudad";

interface NuevoContratoFormProps {
  usuarios: EmpleadoDirectorioRow[];
  tiposContrato: MaestroRow[];
  tiposPagoLocador: MaestroRow[];
  tiposDocumento: MaestroRow[];
  paises: OpcionCombo[];
  proyectos: OpcionCombo[];
  monedas: MaestroRow[];
  regimenesConPlantilla: string[];
  defaultIdUsuario?: string;
}

export default function NuevoContratoForm({
  usuarios,
  tiposContrato,
  tiposPagoLocador,
  tiposDocumento,
  paises,
  proyectos,
  monedas,
  regimenesConPlantilla,
  defaultIdUsuario,
}: NuevoContratoFormProps) {
  const [idTipoContrato, setIdTipoContrato] = useState<number | "">("");
  const [idTipoPagoLocador, setIdTipoPagoLocador] = useState<number | "">("");
  const [idUsuarioSel, setIdUsuarioSel] = useState(defaultIdUsuario ?? "");

  const personaSel = usuarios.find((u) => String(u.ID_USUARIO) === idUsuarioSel) ?? null;
  // Solo el documento (tipo + numero) es obligatorio para el contrato --
  // direccion/pais/ciudad no son parte del cuerpo de los modelos, se
  // pueden completar aqui pero no bloquean la creacion.
  const identidadCompleta = tieneIdentidadCompleta(personaSel);
  const camposObligatoriosFaltantes = [
    !personaSel?.ID_TIPO_DOCUMENTO ? "Tipo de documento" : null,
    !personaSel?.NRO_DOCUMENTO ? "Numero de documento" : null,
  ].filter((c): c is string => c !== null);

  const tipoContratoCodigo = tiposContrato.find((t) => t.ID_MAESTRO === idTipoContrato)?.CODIGO;
  const tipoPagoCodigo = tiposPagoLocador.find((t) => t.ID_MAESTRO === idTipoPagoLocador)?.CODIGO;

  const esLocador = tipoContratoCodigo === "LOCADOR";
  const esPlanilla = tipoContratoCodigo === "PLANILLA_FULLTIME" || tipoContratoCodigo === "PLANILLA_PARTTIME";
  const necesitaTarifaUnica =
    esLocador && (tipoPagoCodigo === "MENSUAL" || tipoPagoCodigo === "POR_JORNADA" || tipoPagoCodigo === "POR_PROYECTO");
  const esPorHora = esLocador && tipoPagoCodigo === "POR_HORA";

  const regimenListo = idTipoContrato !== "" && (!esLocador || idTipoPagoLocador !== "");
  const faltaPlantilla =
    regimenListo && !regimenesConPlantilla.includes(claveRegimen(Number(idTipoContrato), idTipoPagoLocador || null));

  return (
    <form action={crearContratoAction} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Persona</label>
        <ComboBusqueda
          name="idUsuario"
          placeholder="-- selecciona --"
          disabled={usuarios.length === 0}
          defaultValue={defaultIdUsuario}
          opciones={usuarios.map((u) => ({ value: String(u.ID_USUARIO), label: `${u.NOMBRES} ${u.APELLIDOS} (${u.CORREO})` }))}
          onSeleccionar={setIdUsuarioSel}
        />
      </div>

      {personaSel && !identidadCompleta ? (
        <div className="rounded-lg border border-dashed border-amber-300 p-3 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Completa el documento de identidad de {personaSel.NOMBRES} {personaSel.APELLIDOS} antes de continuar --
            falta: {camposObligatoriosFaltantes.join(", ")}.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de documento</label>
              <ComboBusqueda
                name="idTipoDocumento"
                placeholder="-- selecciona --"
                defaultValue={personaSel.ID_TIPO_DOCUMENTO ? String(personaSel.ID_TIPO_DOCUMENTO) : ""}
                opciones={tiposDocumento.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
              />
            </div>
            <Campo
              name="nroDocumento"
              label="Numero de documento"
              required={false}
              defaultValue={personaSel.NRO_DOCUMENTO ?? ""}
            />
            <div className="sm:col-span-2">
              <Campo
                name="direccion"
                label="Direccion (opcional)"
                required={false}
                defaultValue={personaSel.DIRECCION ?? ""}
              />
            </div>
            <p className="sm:col-span-2 text-xs text-slate-400 dark:text-slate-500">
              Pais y ciudad (opcional):
            </p>
            <SelectorPaisCiudad
              paises={paises}
              idPaisInicial={personaSel.ID_PAIS ? String(personaSel.ID_PAIS) : ""}
              idCiudadInicial={personaSel.ID_CIUDAD ? String(personaSel.ID_CIUDAD) : ""}
              ciudadLabelInicial=""
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de contrato</label>
        <ComboBusqueda
          name="idTipoContrato"
          placeholder="-- selecciona --"
          opciones={tiposContrato.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          onSeleccionar={(v) => {
            setIdTipoContrato(v ? Number(v) : "");
            setIdTipoPagoLocador("");
          }}
        />
      </div>

      <Campo name="cargo" label="Cargo" />

      {!esLocador ? (
        <div>
          <label htmlFor="funciones" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Funciones
          </label>
          <textarea
            id="funciones"
            name="funciones"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo name="fechaInicio" label="Fecha de inicio" type="date" required />
        <Campo name="fechaFin" label="Fecha de fin" type="date" required />
      </div>

      {esPlanilla ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Jornada (dias y horario pactados)
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo name="diasLaborales" label="Dias" required={false} placeholder="Ej. Lunes a Viernes" />
            <Campo name="horaInicio" label="Hora de inicio" type="time" required={false} />
            <Campo name="horaFin" label="Hora de fin" type="time" required={false} />
          </div>
          <div className="mt-3">
            <Campo
              name="notaJornada"
              label="Nota sobre la jornada (opcional)"
              required={false}
              placeholder="Ej. Ajustado para cumplir el tope legal de horas part-time"
            />
          </div>
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
            Los conceptos remunerativos (ingreso base, bono, movilidad, etc.) se agregan despues de crear el
            contrato, desde su detalle.
          </p>
        </div>
      ) : null}

      {esLocador ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo de pago</label>
          <ComboBusqueda
            name="idTipoPagoLocador"
            placeholder="-- selecciona --"
            opciones={tiposPagoLocador.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
            onSeleccionar={(v) => setIdTipoPagoLocador(v ? Number(v) : "")}
          />

          {necesitaTarifaUnica ? (
            <div className="mt-3 space-y-3">
              <Campo
                name="tarifa"
                label={
                  tipoPagoCodigo === "MENSUAL"
                    ? "Monto mensual (S/)"
                    : tipoPagoCodigo === "POR_JORNADA"
                      ? "Tarifa por jornada (S/)"
                      : "Monto fijo del proyecto (S/)"
                }
                type="number"
              />
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                  Proyecto / servicio{tipoPagoCodigo === "POR_PROYECTO" ? "" : " (opcional)"}
                </label>
                <ComboBusqueda name="idProyecto" placeholder="-- selecciona --" opciones={proyectos} />
                {tipoPagoCodigo !== "POR_PROYECTO" ? (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Dejalo vacio si es un honorario transversal a varios proyectos -- luego se asigna el costo
                    proyecto por proyecto desde &quot;Mano de obra&quot; en cada uno.
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
                  <ComboBusqueda
                    name="idMoneda"
                    placeholder="-- selecciona --"
                    opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
                  />
                </div>
                <div>
                  <label htmlFor="tipoCambio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    Tipo de cambio (opcional)
                  </label>
                  <input
                    id="tipoCambio"
                    type="number"
                    step="0.0001"
                    name="tipoCambio"
                    placeholder="Ej. 3.75"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Tipo de cambio obligatorio solo si la moneda elegida es distinta a la del proyecto seleccionado.
              </p>
              <Campo name="periodoPago" label="Periodo (ej. MAYO - JUNIO 2026)" required={false} />
            </div>
          ) : null}

          {esPorHora ? (
            <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
              Los proyectos y su tarifa por hora se agregan despues de crear el contrato, desde su detalle -- puede
              tener mas de uno.
            </p>
          ) : null}
        </div>
      ) : null}

      {faltaPlantilla ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Este regimen todavia no tiene una{" "}
          <Link href="/rrhh/contratos/plantillas" className="underline">
            plantilla de contrato activa
          </Link>
          . Crea una antes de poder generar contratos de este tipo.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={usuarios.length === 0 || faltaPlantilla}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Crear contrato
      </button>
    </form>
  );
}

function Campo({
  name,
  label,
  type = "text",
  required = true,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
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
        step={type === "number" ? "0.01" : undefined}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
