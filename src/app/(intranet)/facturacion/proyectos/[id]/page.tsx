import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  obtenerProyecto,
  listarIngresosProyecto,
  listarCostosManoObra,
  listarManoObraHorasProyecto,
  listarHitosProyecto,
  listarClientes,
  listarMovimientosProyecto,
} from "@/lib/db/repositories/proyecto.repository";
import { listarCompras, listarProveedoresPersonaNatural, listarProveedores } from "@/lib/db/repositories/compra.repository";
import { listarContratos, listarTodasLasHorasContrato } from "@/lib/db/repositories/contrato.repository";
import { listarPasivosPorProyecto } from "@/lib/db/repositories/pasivo.repository";
import { listarTodosLosPeriodosPago } from "@/lib/db/repositories/rrhh-periodo-pago.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import {
  actualizarProyectoAction,
  cambiarEstadoProyectoAction,
  resetIngresosProyectoAction,
  resetComprasProyectoAction,
  resetCostosLaboralesProyectoAction,
  agregarIngresoProyectoAction,
  eliminarIngresoProyectoAction,
  eliminarCostoManoObraAction,
  agregarHitoProyectoAction,
} from "@/lib/actions/proyectos";
import { calcularCosteo } from "@/lib/proyectos/costeo";
import { calcularImpuestosItem, calcularImpuestosProyecto } from "@/lib/proyectos/impuestos";
import BarraProgreso from "@/components/facturacion/BarraProgreso";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import HitoFilaAcciones from "@/components/facturacion/HitoFilaAcciones";
import SelectorClienteProyecto from "@/components/facturacion/SelectorClienteProyecto";
import AgregarCostoManoObraForm from "@/components/facturacion/AgregarCostoManoObraForm";
import PagarCostoManoObraFila from "@/components/facturacion/PagarCostoManoObraFila";
import PagarHorasContratoFila from "@/components/rrhh/PagarHorasContratoFila";
import FinanciarConPrestamoFila from "@/components/facturacion/FinanciarConPrestamoFila";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function DetalleProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("PROYECTOS_EMPRESA", "LECTURA");
  const { id } = await params;
  const idProyecto = Number(id);

  const proyecto = await obtenerProyecto(idProyecto);
  if (!proyecto) notFound();

  const [
    ingresos,
    costosManoObra,
    manoObraHoras,
    pasivos,
    compras,
    contratos,
    periodosPorContrato,
    horasPorContrato,
    proveedoresPersonaNatural,
    hitos,
    tiposHito,
    monedas,
    clientes,
    movimientos,
    cuentas,
    tiposPasivo,
    proveedores,
    contactos,
    personal,
    tcLaboral,
    tcVenta,
    tcPrestamo,
  ] = await Promise.all([
    listarIngresosProyecto(idProyecto),
    listarCostosManoObra(idProyecto),
    listarManoObraHorasProyecto(idProyecto),
    listarPasivosPorProyecto(idProyecto),
    listarCompras(null, null, idProyecto),
    listarContratos(),
    listarTodosLosPeriodosPago(),
    listarTodasLasHorasContrato(),
    listarProveedoresPersonaNatural(),
    listarHitosProyecto(idProyecto),
    listarMaestros("TIPO_HITO_FACTURACION"),
    listarMaestros("MONEDA"),
    listarClientes(),
    listarMovimientosProyecto(idProyecto),
    listarCuentas(),
    listarMaestros("TIPO_PASIVO"),
    listarProveedores(),
    listarTodosLosContactosExternos(null),
    listarDirectorio(null, null),
    obtenerTipoCambioVigente("LABORAL"),
    obtenerTipoCambioVigente("VENTA"),
    obtenerTipoCambioVigente("PRESTAMO"),
  ]);

  const costeo = calcularCosteo(proyecto);
  const impuestosProyecto = calcularImpuestosProyecto(hitos, proyecto.MONEDA_CODIGO, tcVenta ? Number(tcVenta) : null);
  const enCurso = proyecto.ESTADO_PROYECTO_CODIGO === "EN_CURSO";
  const hoy = new Date().toISOString().slice(0, 10);

  // Directo del SP (SP_PROYECTO_OBTENER ya trae COSTO_COMPRAS) -- antes se
  // derivaba restando los otros tres buckets de costeo.costoReal, lo que
  // con la conversion de moneda (division por TIPO_CAMBIO, no siempre
  // exacta en binario) podia dejar un residuo de punto flotante y mostrar
  // "-0.00" en vez de "0.00" cuando de verdad no habia compras.
  const costoCompras = Number(proyecto.COSTO_COMPRAS);
  const costoManoObraHoras = Number(proyecto.COSTO_MANO_OBRA_HORAS);
  const costoManoObraManual = Number(proyecto.COSTO_MANO_OBRA_MANUAL);
  const costoManoObraTarifaUnica = Number(proyecto.COSTO_MANO_OBRA_TARIFA_UNICA);
  const costoManoObraTotal = costoManoObraHoras + costoManoObraManual + costoManoObraTarifaUnica;
  const manoObraPendientePago =
    costoManoObraManual -
    Number(proyecto.COSTO_MANO_OBRA_MANUAL_PAGADO) +
    (costoManoObraHoras - Number(proyecto.COSTO_MANO_OBRA_HORAS_PAGADO)) +
    (costoManoObraTarifaUnica - Number(proyecto.COSTO_MANO_OBRA_TARIFA_UNICA_PAGADO));
  const costoPagosRecurrentes = Number(proyecto.COSTO_PAGOS_RECURRENTES);
  const pagosRecurrentesPendientePago = costoPagosRecurrentes - Number(proyecto.COSTO_PAGOS_RECURRENTES_PAGADO);
  const idsIngresoEnPlan = new Set(hitos.map((h) => h.ID_INGRESO).filter((id): id is number => id !== null));

  // Movimientos llegan sin orden util para acumular -- se ordenan
  // ascendente para calcular el saldo corrido y se muestran descendente
  // (mas reciente primero), mismo patron que el plan de pagos de Pasivos.
  const movimientosConSaldo = [...movimientos]
    .sort((a, b) => a.FECHA.localeCompare(b.FECHA))
    .reduce<Array<{ tipo: string; fecha: string; concepto: string; monto: number; saldo: number }>>((acc, m) => {
      const anterior = acc.length > 0 ? acc[acc.length - 1].saldo : 0;
      const monto = Number(m.MONTO);
      const signo = m.TIPO === "INGRESO" ? 1 : -1;
      acc.push({ tipo: m.TIPO, fecha: m.FECHA, concepto: m.CONCEPTO, monto: signo * monto, saldo: anterior + signo * monto });
      return acc;
    }, [])
    .reverse();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{proyecto.NOMBRE}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {proyecto.ES_INTERNO === 1 ? "Proyecto interno (GT)" : (proyecto.CLIENTE_RAZON_SOCIAL ?? "Sin cliente")} — {proyecto.TIPO_PROYECTO_DESCRIPCION} — {proyecto.ESTADO_PROYECTO_DESCRIPCION}
          </p>
        </div>
        {enCurso ? (
          <div className="flex gap-2">
            <form action={cambiarEstadoProyectoAction}>
              <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
              <input type="hidden" name="codigoEstado" value="CERRADO" />
              <ConfirmSubmitButton
                mensaje="¿Cerrar este proyecto?"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cerrar
              </ConfirmSubmitButton>
            </form>
            <form action={cambiarEstadoProyectoAction}>
              <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
              <input type="hidden" name="codigoEstado" value="ANULADO" />
              <ConfirmSubmitButton
                mensaje="¿Anular este proyecto?"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Anular
              </ConfirmSubmitButton>
            </form>
          </div>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Costeo</h2>
        <div className="mt-3 space-y-3">
          <BarraProgreso etiqueta="Costo a hoy vs presupuesto" valor={costeo.costoReal} total={costeo.costoPresupuestado} monedaCodigo={proyecto.MONEDA_CODIGO} invertido />
          <BarraProgreso etiqueta="Facturado vs esperado" valor={Number(proyecto.MONTO_FACTURADO)} total={costeo.ingresoEsperado} monedaCodigo={proyecto.MONEDA_CODIGO} />
          <BarraProgreso etiqueta="Cobrado vs esperado" valor={costeo.ingresoReal} total={costeo.ingresoEsperado} monedaCodigo={proyecto.MONEDA_CODIGO} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-4">
          <Dato etiqueta="Compras (comprometido)" valor={formatearMonto(costoCompras, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Compras (pagado)" valor={formatearMonto(proyecto.COSTO_COMPRAS_PAGADO, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Mano de obra horas (comprometido)" valor={formatearMonto(proyecto.COSTO_MANO_OBRA_HORAS, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Mano de obra horas (pagado)" valor={formatearMonto(proyecto.COSTO_MANO_OBRA_HORAS_PAGADO, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Mano de obra manual (comprometido)" valor={formatearMonto(proyecto.COSTO_MANO_OBRA_MANUAL, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Mano de obra manual (pagado)" valor={formatearMonto(proyecto.COSTO_MANO_OBRA_MANUAL_PAGADO, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Mano de obra tarifa unica (comprometido)" valor={formatearMonto(proyecto.COSTO_MANO_OBRA_TARIFA_UNICA, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Mano de obra tarifa unica (pagado)" valor={formatearMonto(proyecto.COSTO_MANO_OBRA_TARIFA_UNICA_PAGADO, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Pagos recurrentes (comprometido)" valor={formatearMonto(costoPagosRecurrentes, proyecto.MONEDA_CODIGO)} />
          <Dato etiqueta="Pagos recurrentes (pagado)" valor={formatearMonto(proyecto.COSTO_PAGOS_RECURRENTES_PAGADO, proyecto.MONEDA_CODIGO)} />
        </dl>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Margen actual</dt>
            <dd className={`font-medium ${costeo.margenActual < 0 ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>
              {formatearMonto(costeo.margenActual, proyecto.MONEDA_CODIGO)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Margen al cierre</dt>
            <dd className={`font-medium ${costeo.margenAlCierre < 0 ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>
              {formatearMonto(costeo.margenAlCierre, proyecto.MONEDA_CODIGO)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Plan de facturación por cobrar</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{formatearMonto(proyecto.MONTO_PLAN_PENDIENTE, proyecto.MONEDA_CODIGO)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Mano de obra - pendiente de pago</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{formatearMonto(manoObraPendientePago, proyecto.MONEDA_CODIGO)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Pagos recurrentes - pendiente de pago</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{formatearMonto(pagosRecurrentesPendientePago, proyecto.MONEDA_CODIGO)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Pasivo generado</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{formatearMonto(proyecto.PASIVO_GENERADO, proyecto.MONEDA_CODIGO)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">IGV por declarar a SUNAT</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">
              {formatearMonto(impuestosProyecto.igvPorDeclarar, proyecto.MONEDA_CODIGO)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Detraccion pendiente de deposito</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">
              {formatearMonto(impuestosProyecto.detraccionPendienteSoles, "PEN")}
              {proyecto.MONEDA_CODIGO !== "PEN" ? (
                <span className="block text-xs font-normal text-slate-400 dark:text-slate-500">
                  Siempre en soles ante SUNAT, aunque el proyecto sea en {proyecto.MONEDA_CODIGO} -- convertido con el TC vigente de Ventas.
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Gastos</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Composición del costo real total ({formatearMonto(costeo.costoReal, proyecto.MONEDA_CODIGO)}) por fuente.
        </p>
        <div className="mt-3 space-y-3">
          <BarraProgreso etiqueta="Compras" valor={costoCompras} total={costeo.costoReal} monedaCodigo={proyecto.MONEDA_CODIGO} />
          <BarraProgreso etiqueta="Mano de obra" valor={costoManoObraTotal} total={costeo.costoReal} monedaCodigo={proyecto.MONEDA_CODIGO} />
          {costoManoObraTotal > 0 ? (
            <div className="ml-3 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <DesgloseManoObra etiqueta="Horas" valor={costoManoObraHoras} total={costoManoObraTotal} monedaCodigo={proyecto.MONEDA_CODIGO} />
              <DesgloseManoObra etiqueta="Manual" valor={costoManoObraManual} total={costoManoObraTotal} monedaCodigo={proyecto.MONEDA_CODIGO} />
              <DesgloseManoObra etiqueta="Tarifa unica" valor={costoManoObraTarifaUnica} total={costoManoObraTotal} monedaCodigo={proyecto.MONEDA_CODIGO} />
            </div>
          ) : null}
          <BarraProgreso etiqueta="Pagos recurrentes" valor={costoPagosRecurrentes} total={costeo.costoReal} monedaCodigo={proyecto.MONEDA_CODIGO} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Movimientos (ingresos y salidas)</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Ledger cronológico de todo lo que entra (ingresos cobrados) y sale (compras pagadas, mano de obra) del proyecto.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Concepto</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {movimientosConSaldo.map((m, indice) => (
                <tr key={indice}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(m.fecha)}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        m.tipo === "INGRESO"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      }`}
                    >
                      {m.tipo === "INGRESO"
                        ? "Ingreso"
                        : m.tipo === "GASTO_COMPRA"
                          ? "Gasto - Compra"
                          : m.tipo === "GASTO_MANO_OBRA_HORAS"
                            ? "Gasto - Horas"
                            : m.tipo === "GASTO_MANO_OBRA_TARIFA_UNICA"
                              ? "Gasto - Locador (tarifa unica)"
                              : m.tipo === "GASTO_PAGO_RECURRENTE"
                                ? "Gasto - Pago recurrente"
                                : "Gasto - Mano de obra"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{m.concepto}</td>
                  <td className={`px-2 py-2 text-right ${m.monto < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {m.monto < 0 ? "-" : "+"}
                    {formatearMonto(Math.abs(m.monto), proyecto.MONEDA_CODIGO)}
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatearMonto(m.saldo, proyecto.MONEDA_CODIGO)}
                  </td>
                </tr>
              ))}
              {movimientosConSaldo.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay movimientos registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <form action={actualizarProyectoAction} className="space-y-3">
          <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
          <Campo name="nombre" label="Nombre" defaultValue={proyecto.NOMBRE} />
          <SelectorClienteProyecto
            clientes={clientes}
            defaultEsInterno={proyecto.ES_INTERNO === 1}
            defaultIdCliente={proyecto.ID_CLIENTE}
          />
          <Campo name="descripcion" label="Descripcion" defaultValue={proyecto.DESCRIPCION ?? ""} required={false} />
          <Campo name="fechaFinEstimada" label="Fecha de fin estimada" type="date" defaultValue={proyecto.FECHA_FIN_ESTIMADA ?? ""} required={false} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="costoPresupuestado" label="Costo presupuestado" type="number" defaultValue={proyecto.COSTO_PRESUPUESTADO} />
            <Campo name="ingresoEsperado" label="Ingreso esperado" type="number" defaultValue={proyecto.INGRESO_ESPERADO} />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Plan de facturación</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Adelanto, hitos, factura final o facturacion variable. Cada item puede ser un monto fijo o un porcentaje del
          ingreso esperado (se calcula solo). &quot;Cobrar&quot; registra el ingreso real y lo enlaza a este item.
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          El monto de cada item es sin IGV -- IGV (18%) y detraccion (12% sobre el monto con IGV) se calculan solo
          para referencia, no se guardan ni afectan el ingreso real registrado. La detraccion siempre se muestra en
          soles (asi la exige SUNAT, sin importar la moneda del proyecto) -- si el proyecto es en dolares, se
          convierte con el TC vigente de Ventas.
        </p>
        <form action={agregarHitoProyectoAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
          <input type="hidden" name="orden" value={hitos.length} />
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
            <ComboBusqueda
              name="idTipoHito"
              defaultValue={tiposHito[0] ? String(tiposHito[0].ID_MAESTRO) : ""}
              opciones={tiposHito.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
            />
          </div>
          <Campo name="nombre" label="Nombre" placeholder="Ej. Adelanto" />
          <Campo name="fechaEstimada" label="Fecha estimada (opcional)" type="date" required={false} />
          <Campo name="porcentaje" label="% del ingreso esperado (o monto fijo abajo)" type="number" required={false} min={0} max={100} />
          <Campo name="montoFijo" label="Monto fijo (si no usas %)" type="number" required={false} />
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Agregar
            </button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2 text-right">Monto (sin IGV)</th>
                <th className="px-2 py-2 text-right">Detraccion (12%, en soles)</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {hitos.map((h) => {
                const impuestosHito = calcularImpuestosItem(Number(h.MONTO), proyecto.MONEDA_CODIGO, tcVenta ? Number(tcVenta) : null);
                return (
                <tr key={h.ID_HITO}>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-200">
                    {h.NOMBRE}
                    {h.PORCENTAJE ? <span className="ml-1 text-xs text-slate-400">({h.PORCENTAJE}%)</span> : null}
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{h.TIPO_HITO_DESCRIPCION}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(h.MONTO, proyecto.MONEDA_CODIGO)}
                    <span className="block text-xs text-slate-400 dark:text-slate-500">
                      + IGV {formatearMonto(impuestosHito.igv, proyecto.MONEDA_CODIGO)} = {formatearMonto(impuestosHito.montoConIgv, proyecto.MONEDA_CODIGO)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {impuestosHito.detraccionSoles !== null ? formatearMonto(impuestosHito.detraccionSoles, "PEN") : "TC no disponible"}
                    {proyecto.MONEDA_CODIGO !== "PEN" ? (
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        ({formatearMonto(impuestosHito.detraccion, proyecto.MONEDA_CODIGO)})
                      </span>
                    ) : null}
                    <span className="block text-xs text-slate-400 dark:text-slate-500">
                      Neto {formatearMonto(impuestosHito.netoACobrar, proyecto.MONEDA_CODIGO)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        h.ESTADO_HITO_CODIGO === "COBRADO"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : h.ESTADO_HITO_CODIGO === "FACTURADO"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                            : h.ESTADO_HITO_CODIGO === "ANULADO"
                              ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}
                    >
                      {h.ESTADO_HITO_DESCRIPCION}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <HitoFilaAcciones hito={h} idProyecto={proyecto.ID_PROYECTO} nombreProyecto={proyecto.NOMBRE} />
                  </td>
                </tr>
                );
              })}
              {hitos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay items en el plan de facturacion.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Ingresos</h2>
        <form action={agregarIngresoProyectoAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
          <Campo name="fecha" label="Fecha" type="date" defaultValue={hoy} />
          <Campo name="monto" label="Monto" type="number" />
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Moneda</label>
            <ComboBusqueda
              name="idMoneda"
              defaultValue={String(proyecto.ID_MONEDA)}
              opciones={monedas.map((m) => ({ value: String(m.ID_MAESTRO), label: m.DESCRIPCION }))}
            />
          </div>
          <Campo
            name="tipoCambio"
            label="TC (opcional)"
            type="number"
            step="0.0001"
            required={false}
            placeholder="Ej. 3.75"
            defaultValue={tcVenta ?? undefined}
          />
          <div className="sm:col-span-3">
            <Campo name="concepto" label="Concepto" placeholder="Ej. Anticipo" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 sm:col-span-4">
            El TC (precargado con el vigente de Ventas/Ingresos) es obligatorio solo si la moneda es distinta a la
            del proyecto ({proyecto.MONEDA_CODIGO}).
          </p>
          <div className="sm:col-span-4">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Agregar
            </button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Concepto</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ingresos.map((i) => (
                <tr key={i.ID_INGRESO}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(i.FECHA)}</td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{i.CONCEPTO}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(i.MONTO, i.MONEDA_CODIGO)}
                    {i.TIPO_CAMBIO ? (
                      <span className="block text-xs text-slate-400 dark:text-slate-500">TC {i.TIPO_CAMBIO}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {idsIngresoEnPlan.has(i.ID_INGRESO) ? (
                      <span
                        className="text-xs text-slate-400 dark:text-slate-500"
                        title="Este ingreso quedo enlazado a un item cobrado del plan de facturacion y no se puede quitar desde aqui"
                      >
                        Enlazado al plan
                      </span>
                    ) : (
                      <form action={eliminarIngresoProyectoAction} className="inline-block">
                        <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
                        <input type="hidden" name="idIngreso" value={i.ID_INGRESO} />
                        <ConfirmSubmitButton
                          mensaje="¿Eliminar este ingreso?"
                          className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          Quitar
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {ingresos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay ingresos registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Mano de obra (horas)</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Desglose por persona del costo por horas de locadores enlazados a este proyecto.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Persona</th>
                <th className="px-2 py-2">Periodo</th>
                <th className="px-2 py-2 text-right">Horas</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2 text-right">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {manoObraHoras.map((h) => (
                <tr key={h.ID_CONTRATO_HORAS}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                    <Link href={`/rrhh/contratos/${h.ID_CONTRATO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {h.NOMBRES} {h.APELLIDOS}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{h.PERIODO}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{h.HORAS}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(h.MONTO_CALCULADO, h.MONEDA_CODIGO)}
                    {h.TIPO_CAMBIO ? (
                      <span className="block text-xs text-slate-400 dark:text-slate-500">TC {h.TIPO_CAMBIO}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <PagarHorasContratoFila
                        idContrato={h.ID_CONTRATO}
                        idContratoHoras={h.ID_CONTRATO_HORAS}
                        periodo={h.PERIODO}
                        nombreProyecto={proyecto.NOMBRE}
                        montoCalculado={h.MONTO_CALCULADO}
                        fechaPago={h.FECHA_PAGO}
                        idMovimiento={h.ID_MOVIMIENTO}
                        financiadoConPasivo={Boolean(h.FINANCIADO_CON_PASIVO)}
                        idProyecto={proyecto.ID_PROYECTO}
                        cuentas={cuentas}
                      />
                      {h.ID_MOVIMIENTO === null && !h.FINANCIADO_CON_PASIVO ? (
                        <FinanciarConPrestamoFila
                          tipoReferencia="RRHH_CONTRATO_HORAS"
                          idReferencia={h.ID_CONTRATO_HORAS}
                          idProyecto={proyecto.ID_PROYECTO}
                          rutaOrigen={`/facturacion/proyectos/${proyecto.ID_PROYECTO}`}
                          montoSugerido={h.MONTO_CALCULADO}
                          idMonedaSugerida={h.ID_MONEDA}
                          tcSugerido={tcPrestamo}
                          tiposPasivo={tiposPasivo}
                          monedas={monedas}
                          cuentas={cuentas}
                          proveedores={proveedores}
                          contactos={contactos}
                          personal={personal}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {manoObraHoras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay locadores por hora enlazados a este proyecto.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Mano de obra (asignacion manual)</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Para planilla y cualquier tipo de pago que no se registra por hora. Los locadores por hora enlazados a este
          proyecto desde su contrato ya cuentan solos (ver &quot;Mano de obra (horas)&quot; arriba).
        </p>
        <AgregarCostoManoObraForm
          idProyecto={proyecto.ID_PROYECTO}
          contratos={contratos}
          proveedoresPersonaNatural={proveedoresPersonaNatural}
          periodosPorContrato={periodosPorContrato}
          horasPorContrato={horasPorContrato}
          monedas={monedas}
          idMonedaProyecto={proyecto.ID_MONEDA}
          monedaProyectoCodigo={proyecto.MONEDA_CODIGO}
          tcSugerido={tcLaboral}
        />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Persona</th>
                <th className="px-2 py-2">Periodo</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2 text-right">Pago</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {costosManoObra.map((mo) => (
                <tr key={mo.ID_ASIGNACION}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                    {mo.CONTRATO_NOMBRES ? `${mo.CONTRATO_NOMBRES} ${mo.CONTRATO_APELLIDOS}` : (mo.PROVEEDOR_RAZON_SOCIAL ?? "-")}
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{mo.PERIODO}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(mo.MONTO, mo.MONEDA_CODIGO)}
                    {mo.TIPO_CAMBIO ? (
                      <span className="block text-xs text-slate-400 dark:text-slate-500">TC {mo.TIPO_CAMBIO}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <PagarCostoManoObraFila idProyecto={proyecto.ID_PROYECTO} asignacion={mo} cuentas={cuentas} />
                      {mo.ID_MOVIMIENTO === null && !mo.FINANCIADO_CON_PASIVO ? (
                        <FinanciarConPrestamoFila
                          tipoReferencia="PROYECTO_COSTO_MANO_OBRA"
                          idReferencia={mo.ID_ASIGNACION}
                          idProyecto={proyecto.ID_PROYECTO}
                          rutaOrigen={`/facturacion/proyectos/${proyecto.ID_PROYECTO}`}
                          montoSugerido={mo.MONTO}
                          idMonedaSugerida={mo.ID_MONEDA}
                          proveedorSugerido={mo.ID_PROVEEDOR}
                          tcSugerido={tcPrestamo}
                          tiposPasivo={tiposPasivo}
                          monedas={monedas}
                          cuentas={cuentas}
                          proveedores={proveedores}
                          contactos={contactos}
                          personal={personal}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <form action={eliminarCostoManoObraAction} className="inline-block">
                      <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
                      <input type="hidden" name="idAsignacion" value={mo.ID_ASIGNACION} />
                      <ConfirmSubmitButton
                        mensaje="¿Eliminar esta asignacion?"
                        className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        Quitar
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
              {costosManoObra.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay asignaciones manuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Compras vinculadas</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Descripcion</th>
                <th className="px-2 py-2">Proveedor</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {compras.map((c) => (
                <tr key={c.ID_COMPRA}>
                  <td className="px-2 py-2">
                    <Link href={`/facturacion/compras/${c.ID_COMPRA}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {c.DESCRIPCION}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.PROVEEDOR_RAZON_SOCIAL}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(c.MONTO_TOTAL, c.MONEDA_CODIGO)}
                    {c.TIPO_CAMBIO ? (
                      <span className="block text-xs text-slate-400 dark:text-slate-500">TC {c.TIPO_CAMBIO}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.ESTADO_COMPRA_DESCRIPCION}</td>
                </tr>
              ))}
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay compras vinculadas a este proyecto.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Pasivos</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Prestamos que financiaron costos de este proyecto en vez de pagarse con caja (ver &quot;Pasivo
          generado&quot; en Costeo). Pagar cuotas, protestar o anular se gestiona desde el detalle de cada pasivo.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Acreedor</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Financia</th>
                <th className="px-2 py-2 text-right">Monto total</th>
                <th className="px-2 py-2 text-right">Pendiente</th>
                <th className="px-2 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pasivos.map((p) => (
                <tr key={p.ID_PASIVO}>
                  <td className="px-2 py-2">
                    <Link href={`/facturacion/pasivos/${p.ID_PASIVO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {p.ACREEDOR}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{p.TIPO_PASIVO_DESCRIPCION}</td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{p.FINANCIA_DESCRIPCION ?? p.DESCRIPCION ?? "-"}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(p.MONTO_TOTAL, p.MONEDA_CODIGO)}
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatearMonto(p.MONTO_PENDIENTE, p.MONEDA_CODIGO)}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.ESTADO_PASIVO_CODIGO === "ACTIVO"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          : p.ESTADO_PASIVO_CODIGO === "CANCELADO"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {p.ESTADO_PASIVO_DESCRIPCION}
                    </span>
                  </td>
                </tr>
              ))}
              {pasivos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay prestamos financiando costos de este proyecto.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900 dark:bg-red-950/10">
        <h2 className="text-sm font-semibold text-red-800 dark:text-red-400">Zona de riesgo</h2>
        <p className="mt-1 text-xs text-red-700/80 dark:text-red-400/70">
          Borra/desvincula de golpe todo lo cargado de una fuente, incluso lo ya pagado o financiado con prestamo.
          Solo para corregir datos cargados por error -- no tiene deshacer.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={resetIngresosProyectoAction}>
            <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
            <ConfirmSubmitButton
              mensaje="¿Borrar TODOS los ingresos de este proyecto? Esto no se puede deshacer."
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Reset ingresos
            </ConfirmSubmitButton>
          </form>
          <form action={resetComprasProyectoAction}>
            <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
            <ConfirmSubmitButton
              mensaje="¿Desvincular TODAS las compras de este proyecto? Las compras no se borran, solo dejan de contar en su costeo. Esto no se puede deshacer."
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Reset compras
            </ConfirmSubmitButton>
          </form>
          <form action={resetCostosLaboralesProyectoAction}>
            <input type="hidden" name="idProyecto" value={proyecto.ID_PROYECTO} />
            <ConfirmSubmitButton
              mensaje="¿Borrar/desvincular TODOS los costos de mano de obra de este proyecto (asignaciones manuales, horas de locador y contratos de tarifa unica)? Esto no se puede deshacer."
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Reset costos laborales
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{valor}</dd>
    </div>
  );
}

// Sub-fila del desglose de "Mano de obra" dentro de Gastos -- el % es
// dentro del total de mano de obra (no del costo real del proyecto como
// BarraProgreso), y el trazo mas fino/indentado la marca como parte de
// la barra de arriba en vez de una fuente de gasto mas al mismo nivel
// que Compras.
function DesgloseManoObra({
  etiqueta,
  valor,
  total,
  monedaCodigo,
}: {
  etiqueta: string;
  valor: number;
  total: number;
  monedaCodigo: string | null;
}) {
  const pct = total > 0 ? valor / total : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>{etiqueta}</span>
        <span>
          {formatearMonto(valor, monedaCodigo)} ({Math.round(pct * 100)}%)
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-slate-400 dark:bg-slate-600" style={{ width: `${Math.min(pct, 1) * 100}%` }} />
      </div>
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  step,
  required = true,
  placeholder,
  defaultValue,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
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
        step={step ?? (type === "number" ? "0.01" : undefined)}
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
