import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso, puedeGestionarPrestamos } from "@/lib/auth/require-permiso";
import { obtenerPrestamo, listarCuotasPrestamo } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import { agregarCuotaPrestamoAction, subirCompromisoFirmadoAction, marcarCuotaPagadaManualAction } from "@/lib/actions/rrhh-prestamos";
import { etiquetaPeriodoMensual } from "@/lib/rrhh/periodos-pago";
import { formatearNroPrestamo } from "@/lib/rrhh/planilla/generar-compromiso-prestamo-pdf";
import AnularPrestamoBoton from "@/components/rrhh/AnularPrestamoBoton";
import PrestamoCuotaAcciones from "@/components/rrhh/PrestamoCuotaAcciones";
import OtorgarPrestamoForm from "@/components/rrhh/OtorgarPrestamoForm";
import NotaAyuda from "@/components/ui/NotaAyuda";
import SubmitButton from "@/components/ui/SubmitButton";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

function formatearMonto(monto: string | number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function DetallePrestamoPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requirePermiso("RRHH_PLANILLA", "LECTURA");
  const puedeGestionar = await puedeGestionarPrestamos(sesion.idUsuario);
  const { id } = await params;
  const idPrestamo = Number(id);

  const prestamo = await obtenerPrestamo(idPrestamo);
  if (!prestamo) notFound();
  const solicitado = prestamo.ESTADO_PRESTAMO_CODIGO === "SOLICITADO";
  const [cuotas, cuentas, tcPrestamo] = await Promise.all([
    listarCuotasPrestamo(idPrestamo),
    solicitado ? listarCuentas() : Promise.resolve([]),
    solicitado ? obtenerTipoCambioVigente("PRESTAMO") : Promise.resolve(null),
  ]);

  const cod = prestamo.MONEDA_CODIGO;
  const enSoles = cod === "PEN";
  const tc = prestamo.TIPO_CAMBIO ? Number(prestamo.TIPO_CAMBIO) : null;
  const anulado = prestamo.ESTADO_PRESTAMO_CODIGO === "ANULADO";
  const firmado = prestamo.ESTADO_PRESTAMO_CODIGO === "ACTIVO";
  const puedeEscribir = !anulado && !solicitado && puedeGestionar;
  const esContacto = prestamo.ID_CONTACTO !== null;

  const vigentes = cuotas.filter((c) => c.ESTADO_CUOTA_CODIGO !== "ANULADA");
  const totalCuotas = vigentes.reduce((suma, c) => suma + Number(c.MONTO), 0);
  const diferencia = Math.round((totalCuotas - Number(prestamo.MONTO_TOTAL)) * 100) / 100;
  const descontado = cuotas.filter((c) => c.ESTADO_CUOTA_CODIGO === "DESCONTADA").reduce((s, c) => s + Number(c.MONTO), 0);
  const nroPrestamo = formatearNroPrestamo(prestamo.ID_PRESTAMO, prestamo.FECHA_ORIGEN, prestamo.TIPO_PRESTAMO_CODIGO);

  // El compromiso firmado corresponde al cronograma que habia al firmar:
  // si despues se agrego una cuota o se edito una pendiente, hay que
  // volver a generarlo y firmarlo.
  const firma = prestamo.FECHA_FIRMA_COMPROMISO;
  const cronogramaCambioDespuesDeFirma =
    firmado &&
    firma !== null &&
    cuotas.some(
      (c) =>
        c.ESTADO_CUOTA_CODIGO === "PENDIENTE" &&
        c.ID_PLANILLA_DETALLE === null &&
        (c.FECHA_CREACION > firma || (c.CALCULO_AUTOMATICO === 0 && c.FECHA_MODIFICACION !== null && c.FECHA_MODIFICACION > firma)),
    );

  const hoy = new Date();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/rrhh/planilla/prestamos" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            &larr; Préstamos
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
            {prestamo.TIPO_PRESTAMO_DESCRIPCION} a {prestamo.NOMBRES} {prestamo.APELLIDOS}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {nroPrestamo} -- {prestamo.ESTADO_PRESTAMO_DESCRIPCION}
          </p>
        </div>
        {!anulado && puedeGestionar ? <AnularPrestamoBoton idPrestamo={prestamo.ID_PRESTAMO} /> : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta={`Monto del ${prestamo.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO" ? "adelanto" : "préstamo"}`} valor={formatearMonto(prestamo.MONTO_TOTAL, cod)} />
          <Dato etiqueta="Moneda" valor={prestamo.MONEDA_DESCRIPCION} />
          {!enSoles && tc ? <Dato etiqueta="Tipo de cambio pactado" valor={`S/ ${tc.toFixed(4)} por US$ 1.00`} /> : null}
          {solicitado ? (
            <Dato etiqueta="Fecha de solicitud" valor={formatearFecha(prestamo.FECHA_ORIGEN)} />
          ) : (
            <Dato etiqueta="Fecha de otorgamiento" valor={formatearFecha(prestamo.FECHA_ORIGEN)} />
          )}
          {prestamo.DESCRIPCION ? <Dato etiqueta="Motivo" valor={prestamo.DESCRIPCION} /> : null}
          {!solicitado ? <Dato etiqueta="Ya descontado" valor={formatearMonto(descontado, cod)} /> : null}
          <Dato etiqueta="Beneficiario" valor={esContacto ? "Contacto del directorio (sin planilla)" : "Trabajador"} />
          {!esContacto ? <Dato etiqueta="Documento" valor={`${prestamo.TIPO_DOCUMENTO_DESCRIPCION ?? "Documento"} ${prestamo.NRO_DOCUMENTO ?? "-"}`} /> : null}
          {!solicitado ? (
            <Dato
              etiqueta="Cuenta de desembolso"
              valor={prestamo.CUENTA_DESEMBOLSO_NOMBRE ? `${prestamo.CUENTA_DESEMBOLSO_NOMBRE}${prestamo.ID_MOVIMIENTO_DESEMBOLSO ? "" : " (sin movimiento)"}` : "Sin movimiento de caja"}
            />
          ) : null}
          {anulado ? (
            <>
              <Dato etiqueta="Fecha de anulación" valor={formatearFecha(prestamo.FECHA_ANULACION)} />
              <Dato etiqueta="Motivo de anulación" valor={prestamo.MOTIVO_ANULACION ?? "-"} />
            </>
          ) : null}
        </dl>
      </section>

      {solicitado && puedeGestionar ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Otorgar solicitud</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {prestamo.NOMBRES} {prestamo.APELLIDOS} solicitó este {prestamo.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO" ? "adelanto" : "préstamo"} el{" "}
            {formatearFecha(prestamo.FECHA_ORIGEN)}. Define la fecha real de desembolso y el cronograma de descuentos para activarlo.
          </p>
          <OtorgarPrestamoForm prestamo={prestamo} cuentas={cuentas} tcSugerido={tcPrestamo} hoy={hoy.toISOString().slice(0, 10)} />
        </section>
      ) : solicitado ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Solicitud pendiente de que RRHH, Administración o Gerencia la revise y la otorgue.
          </p>
        </section>
      ) : null}

      {!anulado && !solicitado ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Compromiso de pago</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                firmado
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              }`}
            >
              {firmado ? `Firmado el ${formatearFecha(prestamo.FECHA_FIRMA_COMPROMISO)}` : "Pendiente de firma"}
            </span>
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>Descarga el compromiso: trae todos los datos del préstamo y el cronograma de descuentos.</li>
            <li>Imprímelo y haz que lo firmen la empresa y el colaborador.</li>
            <li>Sube el documento firmado (PDF o foto/escaneo). Recién entonces las cuotas se descuentan en planilla.</li>
          </ol>

          {cronogramaCambioDespuesDeFirma ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              El cronograma cambió después de la firma (cuotas agregadas o editadas). Descarga el compromiso actualizado, vuelve a
              firmarlo y súbelo.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={`/api/rrhh/prestamos/${prestamo.ID_PRESTAMO}/compromiso`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Descargar compromiso (PDF)
            </a>
            {prestamo.DOCUMENTO_FIRMADO_PATH ? (
              <a
                href={`/api/rrhh/prestamos/${prestamo.ID_PRESTAMO}/compromiso-firmado`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Ver compromiso firmado
              </a>
            ) : null}
          </div>

          {puedeGestionar ? (
            <>
              <form action={subirCompromisoFirmadoAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <input type="hidden" name="idPrestamo" value={prestamo.ID_PRESTAMO} />
                <div>
                  <label htmlFor="archivo" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    {firmado ? "Reemplazar compromiso firmado" : "Compromiso firmado"}
                  </label>
                  <input
                    id="archivo"
                    name="archivo"
                    type="file"
                    required
                    accept="application/pdf,image/png,image/jpeg"
                    className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
                  />
                </div>
                <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Subiendo...">
                  Subir compromiso firmado
                </SubmitButton>
              </form>
              <NotaAyuda>PDF, PNG o JPG de hasta 15 MB.</NotaAyuda>
            </>
          ) : null}
        </section>
      ) : null}

      {!solicitado ? (
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Cronograma de descuentos</h2>
        <NotaAyuda>
          Cada cuota se descuenta en la planilla de su mes. Una cuota que no llegó a descontarse en su mes se toma en la primera
          planilla posible. Puedes editar o quitar una cuota mientras ninguna planilla la haya tomado.
        </NotaAyuda>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">N°</th>
                <th className="px-2 py-2">Periodo</th>
                <th className="px-2 py-2 text-right">Cuota</th>
                {!enSoles ? <th className="px-2 py-2 text-right">En soles</th> : null}
                <th className="px-2 py-2">Origen</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cuotas.map((c) => {
                const editable = puedeEscribir && c.ESTADO_CUOTA_CODIGO === "PENDIENTE" && c.ID_PLANILLA_DETALLE === null;
                return (
                  <tr key={c.ID_CUOTA} className={c.ESTADO_CUOTA_CODIGO === "ANULADA" ? "opacity-50" : ""}>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.NRO_CUOTA}</td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{etiquetaPeriodoMensual(c.ANIO, c.MES - 1)}</td>
                    <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-200">{formatearMonto(c.MONTO, cod)}</td>
                    {!enSoles ? (
                      <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">
                        {c.MONTO_DESCONTADO_SOLES !== null
                          ? formatearMonto(c.MONTO_DESCONTADO_SOLES, "PEN")
                          : tc
                            ? formatearMonto(Math.round(Number(c.MONTO) * tc * 100) / 100, "PEN")
                            : "-"}
                      </td>
                    ) : null}
                    <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">{c.CALCULO_AUTOMATICO ? "Automática" : "Personalizada"}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          c.ESTADO_CUOTA_CODIGO === "DESCONTADA"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : c.ESTADO_CUOTA_CODIGO === "ANULADA"
                              ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              : c.ID_PLANILLA_DETALLE !== null
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}
                      >
                        {c.ESTADO_CUOTA_CODIGO === "PENDIENTE" && c.ID_PLANILLA_DETALLE !== null ? "En planilla (sin emitir)" : c.ESTADO_CUOTA_DESCRIPCION}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {esContacto && puedeGestionar && firmado && c.ESTADO_CUOTA_CODIGO === "PENDIENTE" && c.ID_PLANILLA_DETALLE === null ? (
                          <form action={marcarCuotaPagadaManualAction}>
                            <input type="hidden" name="idPrestamo" value={prestamo.ID_PRESTAMO} />
                            <input type="hidden" name="idCuota" value={c.ID_CUOTA} />
                            <ConfirmSubmitButton
                              mensaje="¿Marcar esta cuota como pagada? El contacto no tiene planilla, así que esto se registra a mano."
                              pendingText="Marcando..."
                              className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/70"
                            >
                              Marcar pagada
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                        {editable ? <PrestamoCuotaAcciones cuota={c} idPrestamo={prestamo.ID_PRESTAMO} /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {cuotas.length === 0 ? (
                <tr>
                  <td colSpan={enSoles ? 6 : 7} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Sin cuotas.
                  </td>
                </tr>
              ) : null}
            </tbody>
            {vigentes.length > 0 ? (
              <tfoot className="border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td colSpan={2} className="px-2 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Total cuotas</td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{formatearMonto(totalCuotas, cod)}</td>
                  <td colSpan={enSoles ? 3 : 4}></td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        {vigentes.length > 0 && Math.abs(diferencia) >= 0.01 ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Las cuotas suman {formatearMonto(totalCuotas, cod)}, {diferencia > 0 ? "más" : "menos"} que el monto del préstamo (
            {formatearMonto(prestamo.MONTO_TOTAL, cod)}) por {formatearMonto(Math.abs(diferencia), cod)}. Ajusta el cronograma si no es lo
            esperado.
          </p>
        ) : null}

        {puedeEscribir ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Agregar una cuota extra (ej. con la gratificación de julio o diciembre)
            </summary>
            <form action={agregarCuotaPrestamoAction} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="idPrestamo" value={prestamo.ID_PRESTAMO} />
              <div>
                <label htmlFor="mes" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Mes</label>
                <select
                  id="mes"
                  name="mes"
                  defaultValue={7}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="anio" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Año</label>
                <input
                  id="anio"
                  name="anio"
                  type="number"
                  min="2000"
                  required
                  defaultValue={hoy.getFullYear()}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="monto" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Monto ({cod === "USD" ? "US$" : "S/"})</label>
                <input
                  id="monto"
                  name="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
                Agregar cuota
              </SubmitButton>
            </form>
            <NotaAyuda>
              Es una cuota más del cronograma, agendada al mes que elijas -- no cambia la numeración de las demás. Si la agregas
              después de la firma, recuerda regenerar el compromiso y volver a firmarlo.
            </NotaAyuda>
          </details>
        ) : null}
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
