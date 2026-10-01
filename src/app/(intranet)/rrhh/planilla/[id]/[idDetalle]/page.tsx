import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { obtenerDetalle } from "@/lib/db/repositories/rrhh-planilla.repository";
import { listarCuotasDelDetalle } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { etiquetaCuotaPrestamo } from "@/lib/rrhh/planilla/prestamos-planilla";
import {
  actualizarMontosDetalleAction,
  recalcularDetalleAction,
  marcarPagadoDetalleAction,
  emitirDetalleAction,
  regenerarDocumentoDetalleAction,
  subirRxhFirmadoAction,
  subirEvidenciaPagoAction,
  confirmarRecepcionBoletaAction,
} from "@/lib/actions/rrhh-planilla";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import SubmitButton from "@/components/ui/SubmitButton";
import NotaAyuda from "@/components/ui/NotaAyuda";
import PasosDetallePlanilla from "@/components/rrhh/PasosDetallePlanilla";
import CampoMontoBrutoDetalle from "@/components/rrhh/CampoMontoBrutoDetalle";
import Suspension4taForm from "@/components/rrhh/Suspension4taForm";
import { diasHastaVencimiento } from "@/components/ui/IconoAlertaVencimiento";

const DIAS_ALERTA_SUSPENSION_4TA = 30;

function formatearMonto(monto: string | number | null): string {
  if (monto === null) return "S/ 0.00";
  return `S/ ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function PlanillaDetalleColaboradorPage({
  params,
}: {
  params: Promise<{ id: string; idDetalle: string }>;
}) {
  const sesion = await requireSession();
  const { id, idDetalle } = await params;
  const idPlanillaMensual = Number(id);
  const idPlanillaDetalle = Number(idDetalle);

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.ID_PLANILLA_MENSUAL !== idPlanillaMensual) notFound();

  // Ademas de quien tiene LECTURA sobre RRHH_PLANILLA, el propio
  // colaborador puede ver su boleta/RxH -- de solo lectura (y con boton
  // para confirmar que la recibio, si es Planilla), sin las secciones de
  // gestion de RRHH.
  const permisos = await obtenerPermisosUsuario(sesion.idUsuario);
  const tienePermisoPlanilla = tienePermiso(permisos, "RRHH_PLANILLA", "LECTURA");
  const esPropio = detalle.ID_USUARIO === sesion.idUsuario;
  if (!tienePermisoPlanilla && !esPropio) redirect("/");
  const puedeGestionar = tienePermiso(permisos, "RRHH_PLANILLA", "ESCRITURA");

  const cuotasPrestamo = await listarCuotasDelDetalle(idPlanillaDetalle);
  const netoNegativo = Number(detalle.MONTO_NETO) < 0;
  const esPlanilla = detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const emitida = detalle.ESTADO_EMISION_CODIGO === "EMITIDA";
  const faltaPension = esPlanilla && !detalle.ID_SISTEMA_PENSION;
  const hoy = new Date().toISOString().slice(0, 10);
  const tieneSuspension = Boolean(detalle.SUSPENSION_RETENCION_4TA_HASTA && detalle.SUSPENSION_RETENCION_4TA_HASTA >= hoy);
  const diasSuspension = detalle.SUSPENSION_RETENCION_4TA_HASTA ? diasHastaVencimiento(detalle.SUSPENSION_RETENCION_4TA_HASTA) : null;
  const suspensionPorVencer = tieneSuspension && diasSuspension !== null && diasSuspension <= DIAS_ALERTA_SUSPENSION_4TA;
  // Si ya tiene suspension vigente pero el monto guardado todavia carga
  // retencion, es porque se calculo ANTES de que se suba/renueve la
  // suspension -- falta Recalcular para que se refleje.
  const necesitaRecalculoPorSuspension = !esPlanilla && !emitida && tieneSuspension && Number(detalle.MONTO_RETENCION_RENTA ?? 0) > 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/rrhh/planilla/${idPlanillaMensual}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          &larr; {detalle.PERIODO}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {detalle.NOMBRES} {detalle.APELLIDOS}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {detalle.CARGO} -- {esPlanilla ? "Boleta de pago (Planilla)" : `Recibo por honorarios (Locador -- ${detalle.TIPO_PAGO_LOCADOR_DESCRIPCION ?? "-"})`}
            </p>
          </div>
          {emitida ? (
            <div className="flex items-center gap-2">
              <a
                href={`/api/rrhh/planilla/${idPlanillaDetalle}/documento`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {esPlanilla ? "Ver boleta" : "Ver RxH"}
              </a>
              {puedeGestionar ? (
                <form action={regenerarDocumentoDetalleAction}>
                  <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
                  <ConfirmSubmitButton
                    mensaje={`¿Regenerar ${esPlanilla ? "la boleta" : "el RxH"} con los datos y formato actuales? Se reemplaza el PDF ya emitido, sin cambiar montos ni estado.`}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Regenerar {esPlanilla ? "boleta" : "RxH"}
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <PasosDetallePlanilla
        esLocador={!esPlanilla}
        emitida={emitida}
        aportesPagados={Boolean(detalle.AFP_ESSALUD_PAGADO)}
        rxhFirmadoSubido={Boolean(detalle.RXH_FIRMADO_PATH)}
        evidenciaPagoSubida={Boolean(detalle.EVIDENCIA_PAGO_PATH)}
        confirmadoPorColaborador={Boolean(detalle.FECHA_CONFIRMACION_COLABORADOR)}
      />

      {faltaPension ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          A este colaborador le falta configurar su sistema de pension (AFP/ONP) en su ficha del directorio -- el aporte de
          pension quedo en S/ 0.00 y no se puede emitir la boleta hasta corregirlo.{" "}
          <Link href={`/rrhh/directorio/${detalle.ID_USUARIO}`} className="underline">
            Ir a su ficha
          </Link>
          .
        </div>
      ) : null}

      {!esPlanilla ? (
        !tieneSuspension ? (
          <div className="animate-pulse rounded-xl border-2 border-red-400 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/40">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              ⚠ Sin suspensión de Renta 4ta vigente
              {detalle.SUSPENSION_RETENCION_4TA_HASTA ? ` -- venció el ${formatearFecha(detalle.SUSPENSION_RETENCION_4TA_HASTA)}` : ""}
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              Se le está calculando el 8% de retención de Renta 4ta sobre el recibo. Si {detalle.NOMBRES} ya renovó su
              suspensión ante SUNAT, súbela aquí mismo.
            </p>
            {puedeGestionar ? (
              <Suspension4taForm idUsuario={detalle.ID_USUARIO} origen={`/rrhh/planilla/${idPlanillaMensual}/${idPlanillaDetalle}`} />
            ) : null}
          </div>
        ) : suspensionPorVencer ? (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              ⚠ La suspensión de Renta 4ta vence el {formatearFecha(detalle.SUSPENSION_RETENCION_4TA_HASTA as string)} (en{" "}
              {diasSuspension} día{diasSuspension === 1 ? "" : "s"})
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Renueva la constancia ante SUNAT antes de que venza para que no se le empiece a descontar el 8%.
            </p>
            {puedeGestionar ? (
              <Suspension4taForm idUsuario={detalle.ID_USUARIO} origen={`/rrhh/planilla/${idPlanillaMensual}/${idPlanillaDetalle}`} />
            ) : null}
          </div>
        ) : null
      ) : null}

      {necesitaRecalculoPorSuspension ? (
        <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/40">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-300">↻ Este recibo todavía no refleja la suspensión vigente</p>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
            La retención de Renta 4ta se calculó antes de que se registrara la suspensión -- usa &quot;Recalcular con tasas
            vigentes&quot; más abajo para que el monto se actualice.
          </p>
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta={detalle.TIPO_DOCUMENTO_DESCRIPCION ?? "DNI"} valor={detalle.NRO_DOCUMENTO ?? "-"} />
          <Dato etiqueta="Cuenta de pago" valor={detalle.NRO_CUENTA ?? "-"} />
          <Dato etiqueta="CCI" valor={detalle.CCI ?? "-"} />
          <Dato etiqueta="Banco" valor={detalle.BANCO ?? "-"} />
          {esPlanilla ? (
            <Dato
              etiqueta="Sistema de pension"
              valor={
                detalle.SISTEMA_PENSION_DESCRIPCION
                  ? `${detalle.SISTEMA_PENSION_DESCRIPCION}${detalle.AFP_FONDO_DESCRIPCION ? ` (${detalle.AFP_FONDO_DESCRIPCION})` : ""}`
                  : "Sin configurar"
              }
            />
          ) : (
            <Dato
              etiqueta="Suspension retencion 4ta"
              valor={tieneSuspension ? `Vigente hasta ${formatearFecha(detalle.SUSPENSION_RETENCION_4TA_HASTA)}` : "No tiene / vencida"}
            />
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Detalle</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {detalle.ESTADO_EMISION_DESCRIPCION}
          </span>
        </div>

        {!emitida && puedeGestionar ? (
          <form action={actualizarMontosDetalleAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
            <CampoMontoBrutoDetalle valorInicial={detalle.MONTO_BRUTO} />
            {esPlanilla ? (
              <Campo name="montoAportePension" label="Aporte de pension" defaultValue={detalle.MONTO_APORTE_PENSION ?? "0"} />
            ) : null}
            <Campo
              name="montoRetencionRenta"
              label={esPlanilla ? "Retencion Renta 5ta" : "Retencion Renta 4ta"}
              defaultValue={detalle.MONTO_RETENCION_RENTA ?? "0"}
            />
            {esPlanilla ? <Campo name="montoEssalud" label="EsSalud (informativo)" defaultValue={detalle.MONTO_ESSALUD ?? "0"} /> : null}
            <Campo name="montoDescuentoPrestamo" label="Descuento por prestamo" defaultValue={detalle.MONTO_DESCUENTO_PRESTAMO ?? "0"} />
            <div className="flex items-end gap-2 sm:col-span-2">
              <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
                Guardar montos
              </SubmitButton>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Neto = Bruto - Aporte de pension - Retencion - Descuento por prestamo (se recalcula solo al guardar).
              </p>
            </div>
          </form>
        ) : null}

        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-2">
          <Dato etiqueta="Bruto" valor={formatearMonto(detalle.MONTO_BRUTO)} />
          {esPlanilla ? <Dato etiqueta="Aporte de pension" valor={formatearMonto(detalle.MONTO_APORTE_PENSION)} /> : null}
          <Dato etiqueta={esPlanilla ? "Retencion Renta 5ta" : "Retencion Renta 4ta"} valor={formatearMonto(detalle.MONTO_RETENCION_RENTA)} />
          {esPlanilla ? <Dato etiqueta="EsSalud (costo empleador, no afecta el neto)" valor={formatearMonto(detalle.MONTO_ESSALUD)} /> : null}
          <Dato etiqueta="Descuento por prestamo" valor={formatearMonto(detalle.MONTO_DESCUENTO_PRESTAMO)} />
          <Dato etiqueta="NETO A PAGAR" valor={formatearMonto(detalle.MONTO_NETO)} />
          <Dato etiqueta="Calculo" valor={detalle.CALCULO_AUTOMATICO ? "Automatico" : "Editado manualmente"} />
        </dl>

        {netoNegativo ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            El neto a pagar es negativo: las cuotas de prestamo de este mes superan lo que le corresponde. Reprograma alguna cuota
            desde el prestamo antes de emitir.
          </p>
        ) : null}

        {cuotasPrestamo.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Cuotas de prestamo descontadas</p>
            <ul className="mt-2 space-y-1 text-sm">
              {cuotasPrestamo.map((c) => (
                <li key={c.ID_CUOTA} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/rrhh/planilla/prestamos/${c.ID_PRESTAMO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    {etiquetaCuotaPrestamo(c, { anio: detalle.ANIO, mes: detalle.MES })}
                  </Link>
                  <span className="text-slate-700 dark:text-slate-200">{formatearMonto(c.MONTO_DESCONTADO_SOLES ?? 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!emitida && puedeGestionar ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <form action={recalcularDetalleAction}>
              <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
              <SubmitButton
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                pendingText="Recalculando..."
              >
                Recalcular con tasas vigentes
              </SubmitButton>
            </form>
            {!faltaPension ? (
              <form action={emitirDetalleAction}>
                <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
                <ConfirmSubmitButton
                  mensaje={`¿Emitir ${esPlanilla ? "la boleta de pago" : "el recibo por honorarios"}? Ya no se podran editar los montos.`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Emitir
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </section>

      {puedeGestionar ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Aportes (AFP/EsSalud) a SUNAT</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Independiente de si ya se pago el neto al colaborador -- marca cuando la empresa ya remitio estos aportes.
          </p>
          {emitida ? (
            <form action={marcarPagadoDetalleAction} className="mt-3">
              <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
              <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
              <input type="hidden" name="pagado" value={detalle.AFP_ESSALUD_PAGADO ? "0" : "1"} />
              <SubmitButton
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  detalle.AFP_ESSALUD_PAGADO
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {detalle.AFP_ESSALUD_PAGADO ? "Pagado" : "Marcar como pagado"}
              </SubmitButton>
            </form>
          ) : (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
              🔒 Bloqueado -- primero hay que emitir {esPlanilla ? "la boleta" : "el RxH"} (paso 1) más arriba.
            </p>
          )}
        </section>
      ) : null}

      {!esPlanilla ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">RxH firmado y evidencia de pago</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            El recibo por honorarios que el colaborador firmo, y el comprobante de que se le hizo la transferencia --
            independiente de marcar pagados los aportes a SUNAT.
          </p>

          {!emitida ? (
            <p className="mt-3 rounded-lg border-2 border-red-400 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300">
              🔒 Debes emitir el RxH (paso 1) antes de poder subir el RxH firmado o la evidencia de pago.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">RxH firmado</p>
              {detalle.RXH_FIRMADO_PATH ? (
                <a
                  href={`/api/rrhh/planilla/${idPlanillaDetalle}/rxh-firmado`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Ver RxH firmado (subido el {formatearFecha(detalle.FECHA_RXH_FIRMADO_SUBIDO)})
                </a>
              ) : (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">Todavía no se sube.</p>
              )}
              {puedeGestionar ? (
                emitida ? (
                  <form action={subirRxhFirmadoAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
                    <input
                      name="archivo"
                      type="file"
                      required
                      accept="application/pdf,image/png,image/jpeg"
                      className="block text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
                    <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Subiendo...">
                      {detalle.RXH_FIRMADO_PATH ? "Reemplazar" : "Subir"}
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    🔒 Bloqueado -- emite el RxH (paso 1) primero.
                  </p>
                )
              ) : null}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Evidencia de pago</p>
              {detalle.EVIDENCIA_PAGO_PATH ? (
                <a
                  href={`/api/rrhh/planilla/${idPlanillaDetalle}/evidencia-pago`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Ver evidencia (subida el {formatearFecha(detalle.FECHA_EVIDENCIA_PAGO_SUBIDA)})
                </a>
              ) : (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">Todavía no se sube.</p>
              )}
              {puedeGestionar ? (
                detalle.RXH_FIRMADO_PATH ? (
                  <form action={subirEvidenciaPagoAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
                    <input
                      name="archivo"
                      type="file"
                      required
                      accept="application/pdf,image/png,image/jpeg"
                      className="block text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
                    <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Subiendo...">
                      {detalle.EVIDENCIA_PAGO_PATH ? "Reemplazar" : "Subir"}
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    🔒 Bloqueado -- sube el RxH firmado (paso 2) primero.
                  </p>
                )
              ) : null}
            </div>
          </div>
          {puedeGestionar ? <NotaAyuda>PDF, PNG o JPG de hasta 15 MB.</NotaAyuda> : null}
        </section>
      ) : null}

      {esPlanilla ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Recepción de la boleta</h2>
          {detalle.FECHA_CONFIRMACION_COLABORADOR ? (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
              ✓ {esPropio ? "Confirmaste" : `${detalle.NOMBRES} confirmó`} haber recibido la boleta el{" "}
              {formatearFecha(detalle.FECHA_CONFIRMACION_COLABORADOR)}.
            </p>
          ) : esPropio && emitida ? (
            <>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Si ya descargaste y revisaste tu boleta de arriba, confirma que la recibiste.
              </p>
              <form action={confirmarRecepcionBoletaAction} className="mt-3">
                <input type="hidden" name="idPlanillaDetalle" value={detalle.ID_PLANILLA_DETALLE} />
                <SubmitButton
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  pendingText="Confirmando..."
                >
                  Confirmar recepción de mi boleta
                </SubmitButton>
              </form>
            </>
          ) : (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              {emitida ? "El colaborador todavía no confirma que la recibió." : "Pendiente de emitir."}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{valor}</dd>
    </div>
  );
}

function Campo({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
