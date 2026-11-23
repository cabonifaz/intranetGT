"use client";

import { useState } from "react";
import {
  agregarFirmanteConformidadAction,
  actualizarFirmanteConformidadAction,
  eliminarFirmanteConformidadAction,
} from "@/lib/actions/proyecto-conformidad";
import SubmitButton from "@/components/ui/SubmitButton";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import GenerarLinkConformidadButton from "@/components/facturacion/GenerarLinkConformidadButton";
import SubirConformidadFirmadaForm from "@/components/facturacion/SubirConformidadFirmadaForm";
import type { ProyectoConformidadFirmanteRow } from "@/types/db";

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

// Lista de personas que deben dar su conformidad -- puede ser 1 o varias
// (el negocio puede pedir sumar o quitar firmantes en pleno proceso, ver
// comentario de 054_proyecto_conformidad_firmante.sql). La conformidad
// solo pasa a FIRMADA cuando TODOS los de esta lista ya firmaron (ver
// SP_PROYECTO_CONFORMIDAD_RECALCULAR_ESTADO) -- eso lo decide el backend
// solo, este componente no necesita calcularlo.
export default function FirmantesConformidad({
  idConformidad,
  idProyecto,
  firmantes,
  puedeAgregar,
  puedeGestionar,
}: {
  idConformidad: number;
  idProyecto: number;
  firmantes: ProyectoConformidadFirmanteRow[];
  puedeAgregar: boolean;
  puedeGestionar: boolean;
}) {
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [idAccionesAbiertas, setIdAccionesAbiertas] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {firmantes.map((f) => {
          const firmado = f.FECHA_FIRMA !== null;
          return (
            <li key={f.ID_FIRMANTE} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              {idEditando === f.ID_FIRMANTE ? (
                <form
                  action={actualizarFirmanteConformidadAction}
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={() => setIdEditando(null)}
                >
                  <input type="hidden" name="idFirmante" value={f.ID_FIRMANTE} />
                  <input type="hidden" name="idConformidad" value={idConformidad} />
                  <input type="hidden" name="idProyecto" value={idProyecto} />
                  <input
                    name="nombre"
                    required
                    defaultValue={f.NOMBRE}
                    placeholder="Nombre"
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <input
                    name="cargo"
                    defaultValue={f.CARGO ?? ""}
                    placeholder="Cargo (opcional)"
                    className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
                    Guardar
                  </SubmitButton>
                  <button
                    type="button"
                    onClick={() => setIdEditando(null)}
                    className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {f.NOMBRE}
                      {f.CARGO ? <span className="font-normal text-slate-500 dark:text-slate-400"> -- {f.CARGO}</span> : null}
                    </p>
                    <p className={`text-xs ${firmado ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {firmado ? `Firmado el ${formatearFecha(f.FECHA_FIRMA)}` : "Pendiente de firma"}
                      {firmado && f.DOCUMENTO_FIRMADO_INDIVIDUAL_PATH ? (
                        <>
                          {" -- "}
                          <a
                            href={`/api/facturacion/conformidades/firmantes/${f.ID_FIRMANTE}/documento`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            ver documento subido
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {puedeGestionar && !firmado ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIdEditando(f.ID_FIRMANTE)}
                        className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIdAccionesAbiertas(idAccionesAbiertas === f.ID_FIRMANTE ? null : f.ID_FIRMANTE)}
                        className="rounded-full px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                      >
                        {idAccionesAbiertas === f.ID_FIRMANTE ? "Ocultar" : "Firmar"}
                      </button>
                      <form action={eliminarFirmanteConformidadAction} className="inline-block">
                        <input type="hidden" name="idFirmante" value={f.ID_FIRMANTE} />
                        <input type="hidden" name="idConformidad" value={idConformidad} />
                        <input type="hidden" name="idProyecto" value={idProyecto} />
                        <ConfirmSubmitButton
                          mensaje={`¿Quitar a ${f.NOMBRE} de los firmantes de esta conformidad? Si era el último pendiente, la conformidad queda completa de inmediato.`}
                          className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          Quitar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              )}

              {puedeGestionar && !firmado && idAccionesAbiertas === f.ID_FIRMANTE ? (
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
                  <GenerarLinkConformidadButton idFirmante={f.ID_FIRMANTE} idConformidad={idConformidad} idProyecto={idProyecto} />
                  <SubirConformidadFirmadaForm idFirmante={f.ID_FIRMANTE} idConformidad={idConformidad} idProyecto={idProyecto} />
                </div>
              ) : null}
            </li>
          );
        })}
        {firmantes.length === 0 ? <p className="text-sm text-slate-400 dark:text-slate-500">Todavía no se agregó ningún firmante.</p> : null}
      </ul>

      {puedeGestionar && puedeAgregar ? (
        <form action={agregarFirmanteConformidadAction} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <input type="hidden" name="idConformidad" value={idConformidad} />
          <input type="hidden" name="idProyecto" value={idProyecto} />
          <input
            name="nombre"
            required
            placeholder="Nombre de quien firma"
            autoComplete="off"
            className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            name="cargo"
            placeholder="Cargo (opcional)"
            autoComplete="off"
            className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
            Agregar firmante
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
