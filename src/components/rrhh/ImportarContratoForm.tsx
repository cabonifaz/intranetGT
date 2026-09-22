"use client";

import { useState } from "react";
import { subirSolicitudContratoAction } from "@/lib/actions/rrhh-contratos-importacion";
import type { MaestroRow } from "@/lib/db/repositories/maestro.repository";
import type { EmpleadoDirectorioRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import NotaAyuda from "@/components/ui/NotaAyuda";
import SubmitButton from "@/components/ui/SubmitButton";

interface ImportarContratoFormProps {
  colaboradores: EmpleadoDirectorioRow[];
  tiposContrato: MaestroRow[];
  tiposPagoLocador: MaestroRow[];
  ocrActivo: boolean;
}

export default function ImportarContratoForm({ colaboradores, tiposContrato, tiposPagoLocador, ocrActivo }: ImportarContratoFormProps) {
  const [idTipoContrato, setIdTipoContrato] = useState<number | "">("");
  const tipoContratoCodigo = tiposContrato.find((t) => t.ID_MAESTRO === idTipoContrato)?.CODIGO;
  const esLocador = tipoContratoCodigo === "LOCADOR";

  return (
    <form
      action={subirSolicitudContratoAction}
      className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Colaborador</label>
        <ComboBusqueda
          name="idUsuario"
          placeholder="-- selecciona --"
          disabled={colaboradores.length === 0}
          opciones={colaboradores.map((u) => ({ value: String(u.ID_USUARIO), label: `${u.NOMBRES} ${u.APELLIDOS} (${u.CORREO})` }))}
        />
        <NotaAyuda>
          Se elige a mano (no se adivina por lectura automatica) para asegurar que el contrato quede en la persona correcta.
        </NotaAyuda>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de contrato</label>
        <ComboBusqueda
          name="idTipoContrato"
          placeholder="-- selecciona --"
          opciones={tiposContrato.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
          onSeleccionar={(v) => setIdTipoContrato(v ? Number(v) : "")}
        />
        <NotaAyuda>
          Tambien se elige a mano por el mismo motivo -- el resto de los datos (cargo, fechas, remuneracion, cuenta bancaria) se
          completa solo, leyendo el documento que subas abajo.
        </NotaAyuda>
      </div>

      {esLocador ? (
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo de pago</label>
          <ComboBusqueda name="idTipoPagoLocador" placeholder="-- selecciona --" opciones={tiposPagoLocador.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))} />
        </div>
      ) : null}

      <div>
        <label htmlFor="archivo" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          Solicitud escaneada (ya firmada)
        </label>
        <input
          id="archivo"
          name="archivo"
          type="file"
          required
          accept="application/pdf,image/png,image/jpeg"
          className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
        />
        <NotaAyuda>PDF, PNG o JPG de hasta 15 MB. Si no tienes el formato, descarga la solicitud en blanco de arriba.</NotaAyuda>
      </div>

      <SubmitButton
        disabled={colaboradores.length === 0}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        pendingText={ocrActivo ? "Extrayendo datos..." : "Subiendo..."}
      >
        {ocrActivo ? "Subir y extraer datos" : "Subir solicitud"}
      </SubmitButton>
      <NotaAyuda className="justify-center">
        {ocrActivo
          ? "Puede tardar unos segundos mientras se lee el documento. Al terminar pasas directo a revisar los datos extraidos."
          : "Al terminar pasas directo al paso de revision, con los campos en blanco para completarlos a mano."}
      </NotaAyuda>
    </form>
  );
}
