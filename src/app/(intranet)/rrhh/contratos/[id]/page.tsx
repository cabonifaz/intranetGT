import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  obtenerContrato,
  listarConceptosContrato,
  listarProyectosContrato,
  listarHorasContrato,
} from "@/lib/db/repositories/contrato.repository";
import { listarPeriodosPago } from "@/lib/db/repositories/rrhh-periodo-pago.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarProyectos } from "@/lib/db/repositories/proyecto.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { listarProveedores } from "@/lib/db/repositories/compra.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import GenerarLinkContratoButton from "@/components/rrhh/GenerarLinkContratoButton";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import PagarHorasContratoFila from "@/components/rrhh/PagarHorasContratoFila";
import PagarPeriodoContratoFila from "@/components/rrhh/PagarPeriodoContratoFila";
import EditarPeriodoPagoFila from "@/components/rrhh/EditarPeriodoPagoFila";
import FinanciarConPrestamoFila from "@/components/facturacion/FinanciarConPrestamoFila";
import SubmitButton from "@/components/ui/SubmitButton";
import {
  renovarContratoAction,
  agregarConceptoContratoAction,
  eliminarConceptoContratoAction,
  agregarProyectoContratoAction,
  eliminarProyectoContratoAction,
  registrarHorasContratoAction,
  eliminarHorasContratoAction,
  agregarPeriodoPagoAction,
  generarPeriodosPendientesAction,
  eliminarPeriodoPagoAction,
  actualizarFuncionesContratoAction,
  eliminarContratoAction,
} from "@/lib/actions/rrhh";

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

function formatearMoneda(monto: string | number | null, codigoMoneda?: string | null): string {
  if (monto === null) return "-";
  const simbolo = codigoMoneda === "USD" ? "US$" : "S/";
  return `${simbolo} ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

const BOTON_QUITAR =
  "rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400";

export default async function DetalleContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("RRHH_CONTRATOS", "LECTURA");
  const { id } = await params;
  const idContrato = Number(id);

  const contrato = await obtenerContrato(idContrato);
  if (!contrato) notFound();

  const esLocador = contrato.TIPO_CONTRATO_CODIGO === "LOCADOR";
  const esPlanilla = !esLocador;
  const esPorHora = esLocador && contrato.TIPO_PAGO_LOCADOR_CODIGO === "POR_HORA";
  const necesitaPeriodosPago = esPlanilla || (esLocador && !esPorHora);
  const necesitaCuentasYFinanciamiento = esPorHora || necesitaPeriodosPago;

  const [
    conceptos,
    catalogoConceptos,
    proyectos,
    horas,
    proyectosGlobales,
    cuentas,
    periodosPago,
    tiposPasivo,
    monedas,
    proveedores,
    contactos,
    personal,
    tcPrestamo,
  ] = await Promise.all([
    esPlanilla ? listarConceptosContrato(idContrato) : Promise.resolve([]),
    esPlanilla ? listarMaestros("CONCEPTO_REMUNERATIVO") : Promise.resolve([]),
    esPorHora ? listarProyectosContrato(idContrato) : Promise.resolve([]),
    esPorHora ? listarHorasContrato(idContrato) : Promise.resolve([]),
    esPorHora ? listarProyectos() : Promise.resolve([]),
    necesitaCuentasYFinanciamiento ? listarCuentas() : Promise.resolve([]),
    necesitaPeriodosPago ? listarPeriodosPago(idContrato) : Promise.resolve([]),
    necesitaCuentasYFinanciamiento ? listarMaestros("TIPO_PASIVO") : Promise.resolve([]),
    necesitaCuentasYFinanciamiento ? listarMaestros("MONEDA") : Promise.resolve([]),
    necesitaCuentasYFinanciamiento ? listarProveedores() : Promise.resolve([]),
    necesitaCuentasYFinanciamiento ? listarTodosLosContactosExternos(null) : Promise.resolve([]),
    necesitaCuentasYFinanciamiento ? listarDirectorio(null, null) : Promise.resolve([]),
    necesitaCuentasYFinanciamiento ? obtenerTipoCambioVigente("PRESTAMO") : Promise.resolve(null),
  ]);

  const totalConceptos = conceptos.reduce((suma, c) => suma + Number(c.MONTO), 0);
  // Las horas pueden venir de proyectos enlazados en distintas monedas --
  // se agrupa por moneda en vez de sumar todo junto, que mezclaria montos
  // sin convertir (ver 034_rrhh_contrato_moneda.sql).
  const totalesHorasPorMoneda = horas.reduce<Record<string, number>>((acc, h) => {
    acc[h.MONEDA_CODIGO] = (acc[h.MONEDA_CODIGO] ?? 0) + Number(h.MONTO_CALCULADO);
    return acc;
  }, {});
  const montoSugeridoPeriodo = esPlanilla ? totalConceptos : Number(contrato.TARIFA ?? 0);

  const puedeGenerarLink = contrato.ESTADO_CONTRATO_CODIGO === "BORRADOR" || contrato.ESTADO_CONTRATO_CODIGO === "PENDIENTE_FIRMA";
  const puedeRenovar = contrato.ESTADO_CONTRATO_CODIGO === "FIRMADO" || contrato.ESTADO_CONTRATO_CODIGO === "VENCIDO";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {contrato.NOMBRES} {contrato.APELLIDOS}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {contrato.TIPO_CONTRATO_DESCRIPCION} - {contrato.ESTADO_CONTRATO_DESCRIPCION}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta={contrato.TIPO_DOCUMENTO_DESCRIPCION ?? "Documento"} valor={contrato.NRO_DOCUMENTO ?? "-"} />
          <Dato etiqueta="Pais" valor={contrato.PAIS_DESCRIPCION ?? "-"} />
          <Dato etiqueta="Ciudad" valor={contrato.CIUDAD_DESCRIPCION ?? "-"} />
          <Dato etiqueta="Correo" valor={contrato.CORREO} />
          <Dato etiqueta="Cargo" valor={contrato.CARGO} />
          <Dato etiqueta="Fecha de inicio" valor={formatearFecha(contrato.FECHA_INICIO)} />
          <Dato etiqueta="Fecha de fin" valor={formatearFecha(contrato.FECHA_FIN)} />
          {!esLocador ? (
            <>
              <Dato etiqueta="Dias laborales" valor={contrato.DIAS_LABORALES ?? "-"} />
              <Dato
                etiqueta="Horario"
                valor={contrato.HORA_INICIO && contrato.HORA_FIN ? `${contrato.HORA_INICIO} - ${contrato.HORA_FIN}` : "-"}
              />
            </>
          ) : null}
          {esLocador ? (
            <>
              <Dato etiqueta="Tipo de pago" valor={contrato.TIPO_PAGO_LOCADOR_DESCRIPCION ?? "-"} />
              {!esPorHora ? (
                <>
                  <Dato etiqueta="Tarifa" valor={formatearMoneda(contrato.TARIFA, contrato.MONEDA_CODIGO)} />
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Proyecto</dt>
                    <dd className="text-slate-800 dark:text-slate-200">
                      {contrato.ID_PROYECTO ? (
                        <Link href={`/facturacion/proyectos/${contrato.ID_PROYECTO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                          {contrato.NOMBRE_PROYECTO ?? "-"}
                        </Link>
                      ) : (
                        contrato.NOMBRE_PROYECTO ?? "-"
                      )}
                    </dd>
                  </div>
                  <Dato etiqueta="Periodo" valor={contrato.PERIODO_PAGO ?? "-"} />
                </>
              ) : null}
            </>
          ) : (
            <Dato etiqueta="Total conceptos" valor={formatearMoneda(totalConceptos)} />
          )}
          <Dato etiqueta="N° de cuenta" valor={contrato.NRO_CUENTA ?? "Pendiente de firma"} />
          <Dato etiqueta="Banco" valor={contrato.BANCO ?? "Pendiente de firma"} />
          <Dato etiqueta="Fecha de firma" valor={contrato.FECHA_FIRMA ? formatearFecha(contrato.FECHA_FIRMA) : "Sin firmar"} />
        </dl>
      </section>

      {esPlanilla ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Funciones</h2>
          {puedeGenerarLink ? (
            <form action={actualizarFuncionesContratoAction} className="mt-3 space-y-2">
              <input type="hidden" name="idContrato" value={idContrato} />
              <textarea
                name="funciones"
                rows={4}
                defaultValue={contrato.FUNCIONES ?? ""}
                placeholder="Detalle de funciones del puesto"
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
                Guardar funciones
              </SubmitButton>
            </form>
          ) : (
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              {contrato.FUNCIONES || <span className="text-slate-400 dark:text-slate-500">Sin funciones registradas.</span>}
            </p>
          )}
        </section>
      ) : null}

      {esPlanilla ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Conceptos remunerativos</h2>
            <span className="text-sm font-semibold text-slate-800 dark:text-white">{formatearMoneda(totalConceptos)}</span>
          </div>

          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {conceptos.map((c) => (
              <li key={c.ID_CONTRATO_CONCEPTO} className="flex items-center justify-between py-2">
                <span className="text-slate-700 dark:text-slate-200">{c.CONCEPTO_DESCRIPCION}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-300">{formatearMoneda(c.MONTO)}</span>
                  <form action={eliminarConceptoContratoAction}>
                    <input type="hidden" name="idContrato" value={idContrato} />
                    <input type="hidden" name="idContratoConcepto" value={c.ID_CONTRATO_CONCEPTO} />
                    <ConfirmSubmitButton mensaje="¿Quitar este concepto?" className={BOTON_QUITAR} title="Quitar">
                      ×
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
            {conceptos.length === 0 ? (
              <li className="py-2 text-slate-400 dark:text-slate-500">Sin conceptos agregados todavia.</li>
            ) : null}
          </ul>

          <form action={agregarConceptoContratoAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="idContrato" value={idContrato} />
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Concepto</label>
              <div className="w-56">
                <ComboBusqueda
                  name="idConcepto"
                  defaultValue={catalogoConceptos[0] ? String(catalogoConceptos[0].ID_MAESTRO) : ""}
                  opciones={catalogoConceptos.map((c) => ({ value: String(c.ID_MAESTRO), label: c.DESCRIPCION }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Monto (S/)</label>
              <input type="number" step="0.01" name="monto" required className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
              Agregar
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {necesitaPeriodosPago ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Pagos</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Un periodo por mes, generado automaticamente desde el inicio del contrato -- cada uno se paga por
                separado y se puede editar si un mes tuvo un monto distinto al sugerido.
              </p>
            </div>
            <form action={generarPeriodosPendientesAction}>
              <input type="hidden" name="idContrato" value={idContrato} />
              <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Generando...">
                Generar periodos pendientes
              </SubmitButton>
            </form>
          </div>

          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {periodosPago.map((pp) => {
              const editable = pp.ID_MOVIMIENTO === null && !pp.FINANCIADO_CON_PASIVO;
              return (
                <li key={pp.ID_PERIODO_PAGO} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-slate-700 dark:text-slate-200">{pp.PERIODO}</span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-slate-600 dark:text-slate-300">{formatearMoneda(pp.MONTO)}</span>
                    <PagarPeriodoContratoFila idContrato={idContrato} periodo={pp} cuentas={cuentas} />
                    {editable ? (
                      <>
                        <EditarPeriodoPagoFila idContrato={idContrato} periodo={pp} />
                        <FinanciarConPrestamoFila
                          tipoReferencia="RRHH_CONTRATO_PERIODO_PAGO"
                          idReferencia={pp.ID_PERIODO_PAGO}
                          idProyecto={contrato.ID_PROYECTO}
                          rutaOrigen={`/rrhh/contratos/${idContrato}`}
                          montoSugerido={pp.MONTO}
                          tcSugerido={tcPrestamo}
                          tiposPasivo={tiposPasivo}
                          monedas={monedas}
                          cuentas={cuentas}
                          proveedores={proveedores}
                          contactos={contactos}
                          personal={personal}
                        />
                        <form action={eliminarPeriodoPagoAction}>
                          <input type="hidden" name="idContrato" value={idContrato} />
                          <input type="hidden" name="idPeriodoPago" value={pp.ID_PERIODO_PAGO} />
                          <ConfirmSubmitButton mensaje="¿Quitar este periodo?" className={BOTON_QUITAR} title="Quitar">
                            ×
                          </ConfirmSubmitButton>
                        </form>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {periodosPago.length === 0 ? (
              <li className="py-2 text-slate-400 dark:text-slate-500">
                Sin periodos agregados todavia -- usa &quot;Generar periodos pendientes&quot; o agrega uno manual abajo.
              </li>
            ) : null}
          </ul>

          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Agregar un periodo manual (ej. bono extraordinario)
            </summary>
            <form action={agregarPeriodoPagoAction} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="idContrato" value={idContrato} />
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Periodo</label>
                <input name="periodo" placeholder="JUNIO 2026" required className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Monto (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  name="monto"
                  required
                  defaultValue={montoSugeridoPeriodo || undefined}
                  className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
                Agregar periodo
              </SubmitButton>
            </form>
          </details>
        </section>
      ) : null}

      {esPorHora ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Proyectos y tarifa por hora</h2>

          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {proyectos.map((p) => (
              <li key={p.ID_CONTRATO_PROYECTO} className="flex items-center justify-between py-2">
                <span className="text-slate-700 dark:text-slate-200">{p.NOMBRE_PROYECTO ?? "-"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-300">{formatearMoneda(p.TARIFA_HORA, p.MONEDA_CODIGO)}/hora</span>
                  <form action={eliminarProyectoContratoAction}>
                    <input type="hidden" name="idContrato" value={idContrato} />
                    <input type="hidden" name="idContratoProyecto" value={p.ID_CONTRATO_PROYECTO} />
                    <ConfirmSubmitButton
                      mensaje="¿Quitar este proyecto? Tambien se borran las horas cargadas para el."
                      className={BOTON_QUITAR}
                      title="Quitar"
                    >
                      ×
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
            {proyectos.length === 0 ? (
              <li className="py-2 text-slate-400 dark:text-slate-500">Sin proyectos agregados todavia.</li>
            ) : null}
          </ul>

          <form action={agregarProyectoContratoAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="idContrato" value={idContrato} />
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Proyecto / servicio</label>
              <div className="w-56">
                <ComboBusqueda
                  name="idProyecto"
                  placeholder="-- selecciona --"
                  opciones={proyectosGlobales.map((pg) => ({ value: String(pg.ID_PROYECTO), label: pg.NOMBRE }))}
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
                  name="idMoneda"
                  placeholder="-- selecciona --"
                  opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
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
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            El TC es obligatorio solo si la moneda elegida es distinta a la del proyecto.
          </p>

          <h2 className="mt-6 text-sm font-semibold text-slate-800 dark:text-white">Horas registradas</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Carga manual por ahora (total de horas del periodo). El monto se calcula solo con la tarifa del
            proyecto.
          </p>

          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {horas.map((h) => (
              <li key={h.ID_CONTRATO_HORAS} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-slate-700 dark:text-slate-200">
                  {h.NOMBRE_PROYECTO} - {h.PERIODO} ({h.HORAS}h)
                </span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="text-slate-600 dark:text-slate-300">{formatearMoneda(h.MONTO_CALCULADO, h.MONEDA_CODIGO)}</span>
                  <PagarHorasContratoFila
                    idContrato={idContrato}
                    idContratoHoras={h.ID_CONTRATO_HORAS}
                    periodo={h.PERIODO}
                    nombreProyecto={h.NOMBRE_PROYECTO}
                    montoCalculado={h.MONTO_CALCULADO}
                    fechaPago={h.FECHA_PAGO}
                    idMovimiento={h.ID_MOVIMIENTO}
                    financiadoConPasivo={Boolean(h.FINANCIADO_CON_PASIVO)}
                    cuentas={cuentas}
                  />
                  {h.ID_MOVIMIENTO === null && !h.FINANCIADO_CON_PASIVO ? (
                    <FinanciarConPrestamoFila
                      tipoReferencia="RRHH_CONTRATO_HORAS"
                      idReferencia={h.ID_CONTRATO_HORAS}
                      idProyecto={h.ID_PROYECTO}
                      rutaOrigen={`/rrhh/contratos/${idContrato}`}
                      montoSugerido={h.MONTO_CALCULADO}
                      tcSugerido={tcPrestamo}
                      tiposPasivo={tiposPasivo}
                      monedas={monedas}
                      cuentas={cuentas}
                      proveedores={proveedores}
                      contactos={contactos}
                      personal={personal}
                    />
                  ) : null}
                  <form action={eliminarHorasContratoAction}>
                    <input type="hidden" name="idContrato" value={idContrato} />
                    <input type="hidden" name="idContratoHoras" value={h.ID_CONTRATO_HORAS} />
                    <ConfirmSubmitButton mensaje="¿Quitar este registro de horas?" className={BOTON_QUITAR} title="Quitar">
                      ×
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
            {horas.length === 0 ? (
              <li className="py-2 text-slate-400 dark:text-slate-500">Sin horas registradas todavia.</li>
            ) : null}
          </ul>
          {horas.length > 0 ? (
            <p className="mt-2 text-right text-sm font-semibold text-slate-800 dark:text-white">
              Total: {Object.entries(totalesHorasPorMoneda).map(([codigo, monto]) => formatearMoneda(monto, codigo)).join(" + ")}
            </p>
          ) : null}

          {proyectos.length > 0 ? (
            <form action={registrarHorasContratoAction} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="idContrato" value={idContrato} />
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Proyecto</label>
                <div className="w-48">
                  <ComboBusqueda
                    name="idContratoProyecto"
                    defaultValue={proyectos[0] ? String(proyectos[0].ID_CONTRATO_PROYECTO) : ""}
                    opciones={proyectos.map((p) => ({ value: String(p.ID_CONTRATO_PROYECTO), label: p.NOMBRE_PROYECTO ?? "-" }))}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Periodo</label>
                <input name="periodo" placeholder="JUNIO 2026" required className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Horas</label>
                <input type="number" step="0.01" name="horas" required className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Registrando...">
                Registrar
              </SubmitButton>
            </form>
          ) : null}
        </section>
      ) : null}

      {contrato.DOCUMENTO_PATH ? (
        <a
          href={`/api/contratos/${contrato.ID_CONTRATO}/documento`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Ver PDF firmado
        </a>
      ) : null}

      {puedeGenerarLink ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">Link de firma</h2>
          <GenerarLinkContratoButton idContrato={contrato.ID_CONTRATO} />
        </section>
      ) : null}

      {puedeGenerarLink ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">Eliminar contrato</h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Todavia no se firmo -- se puede borrar por completo, no queda historial. Un contrato ya firmado nunca se
            puede eliminar.
          </p>
          <form action={eliminarContratoAction}>
            <input type="hidden" name="idContrato" value={contrato.ID_CONTRATO} />
            <ConfirmSubmitButton
              mensaje="¿Eliminar este contrato? Todavia no se firmo, se borra por completo y no se puede deshacer."
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Eliminar contrato
            </ConfirmSubmitButton>
          </form>
        </section>
      ) : null}

      {puedeRenovar ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">Renovar contrato</h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Copia cargo, funciones y los conceptos/proyectos actuales con las fechas nuevas. Ajusta los montos
            despues desde el detalle del contrato nuevo.
          </p>
          <form action={renovarContratoAction} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
            <input type="hidden" name="idContratoAnterior" value={contrato.ID_CONTRATO} />
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Nueva fecha inicio</label>
              <input type="date" name="fechaInicio" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Nueva fecha fin</label>
              <input type="date" name="fechaFin" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto sm:px-6" pendingText="Creando...">
                Crear renovación
              </SubmitButton>
            </div>
          </form>
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
