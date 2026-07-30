import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  obtenerPagoRecurrente,
  listarInstancias,
} from "@/lib/db/repositories/pago-recurrente.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarProveedores } from "@/lib/db/repositories/compra.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import {
  actualizarPagoRecurrenteAction,
  cambiarEstadoPagoRecurrenteAction,
  generarInstanciasPendientesAction,
  agregarInstanciaAction,
  eliminarInstanciaAction,
} from "@/lib/actions/pago-recurrente";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import IconoAlertaVencimiento, { diasHastaVencimiento } from "@/components/ui/IconoAlertaVencimiento";
import PagarInstanciaPagoRecurrenteFila from "@/components/facturacion/PagarInstanciaPagoRecurrenteFila";
import EditarInstanciaPagoRecurrenteFila from "@/components/facturacion/EditarInstanciaPagoRecurrenteFila";
import FinanciarConPrestamoFila from "@/components/facturacion/FinanciarConPrestamoFila";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

function formatearIntervalo(intervaloMeses: number): string {
  if (intervaloMeses === 1) return "Mensual";
  if (intervaloMeses === 3) return "Trimestral";
  if (intervaloMeses === 6) return "Semestral";
  if (intervaloMeses === 12) return "Anual";
  return `Cada ${intervaloMeses} meses`;
}

export default async function DetallePagoRecurrentePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("PAGOS_RECURRENTES", "LECTURA");
  const { id } = await params;
  const idPagoRecurrente = Number(id);

  const pago = await obtenerPagoRecurrente(idPagoRecurrente);
  if (!pago) notFound();

  const [instancias, cuentas, tiposPasivo, monedas, proveedores, contactos, personal, tcPrestamo] = await Promise.all([
    listarInstancias(idPagoRecurrente),
    listarCuentas(),
    listarMaestros("TIPO_PASIVO"),
    listarMaestros("MONEDA"),
    listarProveedores(),
    listarTodosLosContactosExternos(null),
    listarDirectorio(null, null),
    obtenerTipoCambioVigente("PRESTAMO"),
  ]);

  const activo = pago.ESTADO_CODIGO === "ACTIVO";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{pago.NOMBRE}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatearIntervalo(pago.INTERVALO_MESES)} — {pago.ES_VARIABLE ? "Monto variable" : "Monto fijo"} —{" "}
            {pago.PROYECTO_NOMBRE ? (
              <Link href={`/facturacion/proyectos/${pago.ID_PROYECTO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                {pago.PROYECTO_NOMBRE}
              </Link>
            ) : (
              "Administrativo/general"
            )}
          </p>
        </div>
        <form action={cambiarEstadoPagoRecurrenteAction}>
          <input type="hidden" name="idPagoRecurrente" value={pago.ID_PAGO_RECURRENTE} />
          <input type="hidden" name="activo" value={activo ? "0" : "1"} />
          <button
            type="submit"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activo
                ? "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {activo ? "Desactivar" : "Activar"}
          </button>
        </form>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Moneda" valor={pago.MONEDA_CODIGO} />
          {pago.TIPO_CAMBIO ? <Dato etiqueta="Tipo de cambio" valor={pago.TIPO_CAMBIO} /> : null}
          <Dato etiqueta="Fecha de inicio" valor={formatearFecha(pago.FECHA_INICIO)} />
          <Dato etiqueta="Dia de vencimiento" valor={String(pago.DIA_VENCIMIENTO)} />
        </dl>

        <form action={actualizarPagoRecurrenteAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <input type="hidden" name="idPagoRecurrente" value={pago.ID_PAGO_RECURRENTE} />
          <Campo name="nombre" label="Nombre" defaultValue={pago.NOMBRE} />
          <Campo name="descripcion" label="Descripcion" defaultValue={pago.DESCRIPCION ?? ""} required={false} />
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              name="esVariable"
              value="1"
              defaultChecked={pago.ES_VARIABLE === 1}
              className="rounded border-slate-300 dark:border-slate-700"
            />
            Monto variable
          </label>
          {pago.ES_VARIABLE !== 1 ? (
            <Campo name="montoFijo" label="Monto fijo" type="number" defaultValue={pago.MONTO_FIJO ?? ""} />
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cada cuantos meses</label>
              <input
                name="intervaloMeses"
                type="number"
                min={1}
                required
                defaultValue={pago.INTERVALO_MESES}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <Campo name="diaVencimiento" label="Dia de vencimiento" type="number" min={1} max={31} defaultValue={String(pago.DIA_VENCIMIENTO)} />
          </div>
          <Campo name="fechaFin" label="Fecha de fin (opcional)" type="date" required={false} defaultValue={pago.FECHA_FIN ?? ""} />
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de pago por defecto</label>
            <ComboBusqueda
              name="idCuentaPagoDefault"
              placeholder="-- sin definir --"
              defaultValue={pago.ID_CUENTA_PAGO_DEFAULT ? String(pago.ID_CUENTA_PAGO_DEFAULT) : ""}
              opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
            />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>

      {activo ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Generar instancias pendientes</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Esto ya corre solo una vez al dia (primera visita a Facturacion). Usa este boton para forzar un chequeo
            inmediato -- ej. justo despues de crear este pago -- sin esperar a la proxima visita.
          </p>
          <form action={generarInstanciasPendientesAction} className="mt-3">
            <input type="hidden" name="idPagoRecurrente" value={pago.ID_PAGO_RECURRENTE} />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Generar
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Agregar instancia suelta</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Para un periodo fuera del calendario regular, o para corregir uno que &quot;Generar&quot; no cubrio.
        </p>
        <form action={agregarInstanciaAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input type="hidden" name="idPagoRecurrente" value={pago.ID_PAGO_RECURRENTE} />
          <Campo name="periodo" label="Periodo" placeholder="Ej. JULIO 2026" />
          <Campo name="fechaVencimiento" label="Vencimiento" type="date" />
          <Campo name="monto" label="Monto" type="number" defaultValue={pago.ES_VARIABLE === 1 ? "" : pago.MONTO_FIJO ?? ""} />
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Agregar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Instancias</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Periodo</th>
                <th className="px-2 py-2">Vencimiento</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2">Cuenta</th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {instancias.map((i) => {
                const puedeEditar = i.ID_MOVIMIENTO === null && !i.FINANCIADO_CON_PASIVO;
                return (
                  <tr key={i.ID_INSTANCIA}>
                    <td className="px-2 py-2 text-slate-700 dark:text-slate-200">{i.PERIODO}</td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        {formatearFecha(i.FECHA_VENCIMIENTO)}
                        {puedeEditar ? (
                          <IconoAlertaVencimiento dias={diasHastaVencimiento(i.FECHA_VENCIMIENTO)} fecha={i.FECHA_VENCIMIENTO} />
                        ) : null}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                      {formatearMonto(i.MONTO, pago.MONEDA_CODIGO)}
                    </td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{i.CUENTA_PAGO_NOMBRE ?? "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col items-end gap-1">
                        <PagarInstanciaPagoRecurrenteFila
                          idPagoRecurrente={pago.ID_PAGO_RECURRENTE}
                          idInstancia={i.ID_INSTANCIA}
                          nombrePagoRecurrente={pago.NOMBRE}
                          periodo={i.PERIODO}
                          monto={i.MONTO}
                          idCuentaSugerida={i.ID_CUENTA_PAGO}
                          fechaPago={i.FECHA_PAGO}
                          idMovimiento={i.ID_MOVIMIENTO}
                          financiadoConPasivo={Boolean(i.FINANCIADO_CON_PASIVO)}
                          idProyecto={pago.ID_PROYECTO}
                          cuentas={cuentas}
                        />
                        {puedeEditar ? (
                          <>
                            <FinanciarConPrestamoFila
                              tipoReferencia="PAGO_RECURRENTE_INSTANCIA"
                              idReferencia={i.ID_INSTANCIA}
                              idProyecto={pago.ID_PROYECTO}
                              rutaOrigen={`/facturacion/pagos-recurrentes/${pago.ID_PAGO_RECURRENTE}`}
                              montoSugerido={i.MONTO}
                              idMonedaSugerida={pago.ID_MONEDA}
                              tcSugerido={tcPrestamo}
                              tiposPasivo={tiposPasivo}
                              monedas={monedas}
                              cuentas={cuentas}
                              proveedores={proveedores}
                              contactos={contactos}
                              personal={personal}
                            />
                            <EditarInstanciaPagoRecurrenteFila
                              idPagoRecurrente={pago.ID_PAGO_RECURRENTE}
                              idInstancia={i.ID_INSTANCIA}
                              monto={i.MONTO}
                              idCuentaActual={i.ID_CUENTA_PAGO}
                              cuentas={cuentas}
                              puedeEditar={puedeEditar}
                            />
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      {puedeEditar ? (
                        <form action={eliminarInstanciaAction}>
                          <input type="hidden" name="idPagoRecurrente" value={pago.ID_PAGO_RECURRENTE} />
                          <input type="hidden" name="idInstancia" value={i.ID_INSTANCIA} />
                          <ConfirmSubmitButton
                            mensaje="¿Quitar esta instancia?"
                            className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            ×
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {instancias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay instancias generadas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
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

function Campo({
  name,
  label,
  type = "text",
  required = true,
  placeholder,
  defaultValue,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  min?: number;
  max?: number;
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
        min={min}
        max={max}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
