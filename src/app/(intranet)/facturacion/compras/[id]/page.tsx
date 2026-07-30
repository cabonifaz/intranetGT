import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerCompra, listarPagosCompra, listarProveedores } from "@/lib/db/repositories/compra.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import { registrarPagoCompraAction } from "@/lib/actions/compras";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
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

export default async function DetalleCompraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("COMPRAS_EMPRESA", "LECTURA");
  const { id } = await params;
  const idCompra = Number(id);

  const compra = await obtenerCompra(idCompra);
  if (!compra) notFound();

  const [pagos, cuentas, tiposPasivo, monedas, proveedores, contactos, personal, tcPrestamo] = await Promise.all([
    listarPagosCompra(idCompra),
    listarCuentas(),
    listarMaestros("TIPO_PASIVO"),
    listarMaestros("MONEDA"),
    listarProveedores(),
    listarTodosLosContactosExternos(null),
    listarDirectorio(null, null),
    obtenerTipoCambioVigente("PRESTAMO"),
  ]);

  const montoPendiente = Number(compra.MONTO_TOTAL) - Number(compra.MONTO_PAGADO) - Number(compra.MONTO_FINANCIADO);
  const puedePagar = compra.ESTADO_COMPRA_CODIGO === "PENDIENTE_PAGO" || compra.ESTADO_COMPRA_CODIGO === "PARCIAL";
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{compra.DESCRIPCION}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {compra.PROVEEDOR_RAZON_SOCIAL} — {compra.ESTADO_COMPRA_DESCRIPCION}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Monto total" valor={formatearMonto(compra.MONTO_TOTAL, compra.MONEDA_CODIGO)} />
          <Dato etiqueta="Pagado" valor={formatearMonto(compra.MONTO_PAGADO, compra.MONEDA_CODIGO)} />
          {Number(compra.MONTO_FINANCIADO) > 0 ? (
            <Dato etiqueta="Financiado con prestamo" valor={formatearMonto(compra.MONTO_FINANCIADO, compra.MONEDA_CODIGO)} />
          ) : null}
          <Dato etiqueta="Pendiente" valor={formatearMonto(montoPendiente, compra.MONEDA_CODIGO)} />
          {compra.TIPO_CAMBIO ? <Dato etiqueta="Tipo de cambio" valor={compra.TIPO_CAMBIO} /> : null}
          <Dato etiqueta="Fecha de compra" valor={formatearFecha(compra.FECHA_COMPRA)} />
          {compra.FECHA_VENCIMIENTO ? <Dato etiqueta="Fecha de vencimiento" valor={formatearFecha(compra.FECHA_VENCIMIENTO)} /> : null}
          {compra.NRO_DOCUMENTO ? <Dato etiqueta="N° de documento" valor={compra.NRO_DOCUMENTO} /> : null}
        </dl>
      </section>

      {puedePagar ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Registrar pago</h2>
          <form action={registrarPagoCompraAction} className="mt-3 space-y-3">
            <input type="hidden" name="idCompra" value={compra.ID_COMPRA} />
            <input type="hidden" name="concepto" value={`Pago compra - ${compra.DESCRIPCION} (${compra.PROVEEDOR_RAZON_SOCIAL})`} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta</label>
                <ComboBusqueda
                  name="idCuenta"
                  placeholder="-- selecciona --"
                  opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
                />
              </div>
              <Campo name="fechaPago" label="Fecha de pago" type="date" defaultValue={hoy} />
            </div>
            <Campo name="monto" label="Monto" type="number" defaultValue={montoPendiente.toFixed(2)} />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Registrar pago
            </button>
          </form>

          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <FinanciarConPrestamoFila
              tipoReferencia="COMPRA"
              idReferencia={compra.ID_COMPRA}
              idProyecto={compra.ID_PROYECTO}
              rutaOrigen={`/facturacion/compras/${compra.ID_COMPRA}`}
              montoSugerido={montoPendiente.toFixed(2)}
              idMonedaSugerida={compra.ID_MONEDA}
              proveedorSugerido={compra.ID_PROVEEDOR}
              tcSugerido={tcPrestamo}
              tiposPasivo={tiposPasivo}
              monedas={monedas}
              cuentas={cuentas}
              proveedores={proveedores}
              contactos={contactos}
              personal={personal}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Pagos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Cuenta</th>
                <th className="px-2 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagos.map((p) => (
                <tr key={p.ID_PAGO}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(p.FECHA_PAGO)}</td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{p.CUENTA_NOMBRE}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(p.MONTO, compra.MONEDA_CODIGO)}</td>
                </tr>
              ))}
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay pagos registrados.
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
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
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
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
