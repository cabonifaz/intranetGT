"use client";

import { useState } from "react";
import { confirmarImportacionContratoAction } from "@/lib/actions/rrhh-contratos-importacion";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { ContratoImportacionRow, EmpleadoDirectorioRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import NotaAyuda from "@/components/ui/NotaAyuda";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

interface RevisarImportacionContratoFormProps {
  importacion: ContratoImportacionRow;
  colaboradores: EmpleadoDirectorioRow[];
  tiposContrato: MaestroRow[];
  tiposPagoLocador: MaestroRow[];
  monedas: MaestroRow[];
}

export default function RevisarImportacionContratoForm({
  importacion,
  colaboradores,
  tiposContrato,
  tiposPagoLocador,
  monedas,
}: RevisarImportacionContratoFormProps) {
  const [idTipoContrato, setIdTipoContrato] = useState<number | "">(importacion.ID_TIPO_CONTRATO);
  const [idTipoPagoLocador, setIdTipoPagoLocador] = useState<number | "">(importacion.ID_TIPO_PAGO_LOCADOR ?? "");
  const [idMoneda, setIdMoneda] = useState<number | "">(importacion.ID_MONEDA ?? "");

  const tipoContratoCodigo = tiposContrato.find((t) => t.ID_MAESTRO === idTipoContrato)?.CODIGO;
  const tipoPagoCodigo = tiposPagoLocador.find((t) => t.ID_MAESTRO === idTipoPagoLocador)?.CODIGO;
  const monedaCodigo = monedas.find((m) => m.ID_MAESTRO === idMoneda)?.CODIGO;
  const esLocador = tipoContratoCodigo === "LOCADOR";
  const esPlanilla = !esLocador;
  const necesitaTarifa = esLocador && tipoPagoCodigo !== "POR_HORA";
  const necesitaTc = necesitaTarifa && monedaCodigo && monedaCodigo !== "PEN";

  return (
    <form action={confirmarImportacionContratoAction} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <input type="hidden" name="idContrato" value={importacion.ID_CONTRATO} />

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Colaborador</label>
        <ComboBusqueda
          name="idUsuario"
          defaultValue={String(importacion.ID_USUARIO)}
          opciones={colaboradores.map((u) => ({ value: String(u.ID_USUARIO), label: `${u.NOMBRES} ${u.APELLIDOS} (${u.CORREO})` }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de contrato</label>
          <ComboBusqueda
            name="idTipoContrato"
            defaultValue={String(importacion.ID_TIPO_CONTRATO)}
            opciones={tiposContrato.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
            onSeleccionar={(v) => setIdTipoContrato(v ? Number(v) : "")}
          />
        </div>
        {esLocador ? (
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de pago</label>
            <ComboBusqueda
              name="idTipoPagoLocador"
              defaultValue={importacion.ID_TIPO_PAGO_LOCADOR ? String(importacion.ID_TIPO_PAGO_LOCADOR) : ""}
              opciones={tiposPagoLocador.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
              onSeleccionar={(v) => setIdTipoPagoLocador(v ? Number(v) : "")}
            />
          </div>
        ) : null}
      </div>

      <Campo name="cargo" label="Cargo" defaultValue={importacion.CARGO} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo name="fechaInicio" label="Fecha de inicio" type="date" defaultValue={importacion.FECHA_INICIO?.slice(0, 10)} />
        <Campo name="fechaFin" label="Fecha de fin (vacio = indefinido)" type="date" required={false} defaultValue={importacion.FECHA_FIN?.slice(0, 10) ?? ""} />
      </div>

      {esPlanilla ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Jornada</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo name="diasLaborales" label="Dias" required={false} defaultValue={importacion.DIAS_LABORALES ?? ""} />
            <Campo name="horaInicio" label="Hora de inicio" type="time" required={false} defaultValue={importacion.HORA_INICIO?.slice(0, 5) ?? ""} />
            <Campo name="horaFin" label="Hora de fin" type="time" required={false} defaultValue={importacion.HORA_FIN?.slice(0, 5) ?? ""} />
          </div>
          <NotaAyuda>
            Los conceptos remunerativos se revisan aparte, en el detalle del contrato (despues de confirmar) -- si la solicitud
            traia una tabla de conceptos, los que se pudieron reconocer ya se agregaron.
          </NotaAyuda>
        </div>
      ) : null}

      {necesitaTarifa ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="tarifa" label="Tarifa" type="number" defaultValue={importacion.TARIFA ?? ""} />
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
              <ComboBusqueda
                name="idMoneda"
                defaultValue={importacion.ID_MONEDA ? String(importacion.ID_MONEDA) : ""}
                opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
                onSeleccionar={(v) => setIdMoneda(v ? Number(v) : "")}
              />
            </div>
          </div>
          {necesitaTc ? <Campo name="tipoCambio" label="Tipo de cambio" type="number" required={false} defaultValue={importacion.TIPO_CAMBIO ?? ""} /> : null}
          <Campo name="periodoPago" label="Periodo de pago" required={false} defaultValue={importacion.PERIODO_PAGO ?? ""} />
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Cuenta bancaria</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo name="nroCuenta" label="N° de cuenta" required={false} defaultValue={importacion.NRO_CUENTA ?? ""} />
          <Campo name="cci" label="CCI" required={false} defaultValue={importacion.CCI ?? ""} />
          <Campo name="banco" label="Banco" required={false} defaultValue={importacion.BANCO ?? ""} />
        </div>
      </div>

      <Campo name="fechaFirma" label="Fecha de firma" type="date" required={false} />

      <ConfirmSubmitButton
        mensaje="¿Confirmar? El contrato quedara activo (Firmado) con estos datos, igual que si se hubiera firmado por el flujo normal."
        pendingText="Confirmando..."
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Confirmar y activar contrato
      </ConfirmSubmitButton>
    </form>
  );
}

function Campo({
  name,
  label,
  type = "text",
  required = true,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
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
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
