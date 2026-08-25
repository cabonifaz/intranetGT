import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerCuenta, listarMovimientosCuenta } from "@/lib/db/repositories/cuenta.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarContratos } from "@/lib/db/repositories/contrato.repository";
import { listarHitosIgvPendiente } from "@/lib/db/repositories/proyecto.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import {
  actualizarCuentaAction,
  cambiarEstadoCuentaAction,
  registrarMovimientoAction,
  eliminarMovimientoAction,
  aplicarSaldoIgvFavorAction,
} from "@/lib/actions/cuentas";
import { calcularIgvConsolidado } from "@/lib/proyectos/impuestos";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function DetalleCuentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("CUENTAS_EMPRESA", "LECTURA");
  const { id } = await params;
  const idCuenta = Number(id);

  const cuenta = await obtenerCuenta(idCuenta);
  if (!cuenta) notFound();

  const esIgvFavor = cuenta.TIPO_CUENTA_CODIGO === "IGV_FAVOR";

  const [movimientos, tiposMovimiento, contratos, hitosIgv, tcVenta] = await Promise.all([
    listarMovimientosCuenta(idCuenta),
    listarMaestros("TIPO_MOVIMIENTO_CUENTA"),
    listarContratos(),
    esIgvFavor ? listarHitosIgvPendiente() : Promise.resolve([]),
    esIgvFavor ? obtenerTipoCambioVigente("VENTA") : Promise.resolve(null),
  ]);

  const activa = cuenta.ESTADO_CODIGO === "ACTIVO";
  const ultimoMovimientoId = movimientos[0]?.ID_MOVIMIENTO ?? null;
  const hoy = new Date().toISOString().slice(0, 10);

  const igvConsolidado = esIgvFavor ? calcularIgvConsolidado(hitosIgv, tcVenta ? Number(tcVenta) : null) : null;
  const saldoDisponible = Math.max(Number(cuenta.SALDO_ACTUAL), 0);
  const montoAplicable = igvConsolidado ? Math.min(igvConsolidado.igvTotalSoles, saldoDisponible) : 0;
  const igvRestantePagar = igvConsolidado ? Math.max(igvConsolidado.igvTotalSoles - montoAplicable, 0) : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{cuenta.NOMBRE}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {cuenta.TIPO_CUENTA_DESCRIPCION}
            {cuenta.BANCO_DESCRIPCION ? ` - ${cuenta.BANCO_DESCRIPCION}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/facturacion/pasivos/plan-de-pagos?cuenta=${cuenta.ID_CUENTA}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ver plan de pagos
          </Link>
          <form action={cambiarEstadoCuentaAction}>
            <input type="hidden" name="idCuenta" value={cuenta.ID_CUENTA} />
            <input type="hidden" name="activo" value={activa ? "0" : "1"} />
            <SubmitButton
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                activa
                  ? "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {activa ? "Desactivar" : "Activar"}
            </SubmitButton>
          </form>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Saldo actual" valor={formatearMonto(cuenta.SALDO_ACTUAL, cuenta.MONEDA_CODIGO)} />
          <Dato etiqueta="Saldo inicial" valor={formatearMonto(cuenta.SALDO_INICIAL, cuenta.MONEDA_CODIGO)} />
          {cuenta.MONEDA_DESCRIPCION ? <Dato etiqueta="Moneda" valor={cuenta.MONEDA_DESCRIPCION} /> : null}
          {cuenta.BANCO_DESCRIPCION ? <Dato etiqueta="Banco" valor={cuenta.BANCO_DESCRIPCION} /> : null}
        </dl>

        <form action={actualizarCuentaAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <input type="hidden" name="idCuenta" value={cuenta.ID_CUENTA} />
          <Campo name="nombre" label="Nombre" defaultValue={cuenta.NOMBRE} />
          {cuenta.ID_BANCO ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo name="nroCuenta" label="N° de cuenta" defaultValue={cuenta.NRO_CUENTA ?? ""} required={false} />
              <Campo name="cci" label="CCI" defaultValue={cuenta.CCI ?? ""} required={false} />
            </div>
          ) : null}
          <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
            Guardar
          </SubmitButton>
        </form>
      </section>

      {esIgvFavor && igvConsolidado ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">IGV pendiente de declarar</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Suma el IGV (18%) de los items del Plan de facturación ya facturados/cobrados de TODOS los proyectos --
            siempre en soles, igual que la declaración a SUNAT. El saldo a favor cubre lo que alcance; el resto queda
            como IGV a pagar en efectivo.
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Dato etiqueta="IGV total por declarar" valor={formatearMonto(igvConsolidado.igvTotalSoles, "PEN")} />
            <Dato etiqueta="Se aplicaría del saldo a favor" valor={formatearMonto(montoAplicable, "PEN")} />
            <Dato etiqueta="IGV restante a pagar" valor={formatearMonto(igvRestantePagar, "PEN")} />
          </dl>
          {igvConsolidado.itemsSinConvertir > 0 ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {igvConsolidado.itemsSinConvertir} item(s) en dólares no se pudieron convertir (TC vigente de Ventas no
              disponible) -- no están incluidos en el total.
            </p>
          ) : null}
          {montoAplicable > 0 ? (
            <form
              action={aplicarSaldoIgvFavorAction}
              className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-3"
            >
              <input type="hidden" name="idCuenta" value={cuenta.ID_CUENTA} />
              <Campo name="fechaMovimiento" label="Fecha" type="date" defaultValue={hoy} />
              <Campo name="monto" label="Monto a aplicar" type="number" defaultValue={montoAplicable.toFixed(2)} />
              <div className="flex items-end">
                <SubmitButton className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Aplicando...">
                  Aplicar contra saldo a favor
                </SubmitButton>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              No hay saldo a favor disponible o no hay IGV pendiente por declarar.
            </p>
          )}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Registrar movimiento</h2>
        <form action={registrarMovimientoAction} className="mt-3 space-y-3">
          <input type="hidden" name="idCuenta" value={cuenta.ID_CUENTA} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
              <ComboBusqueda
                name="idTipoMovimiento"
                defaultValue={tiposMovimiento[0] ? String(tiposMovimiento[0].ID_MAESTRO) : ""}
                opciones={tiposMovimiento.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
              />
            </div>
            <Campo name="fechaMovimiento" label="Fecha" type="date" />
          </div>
          <Campo name="monto" label="Monto" type="number" />
          <Campo name="concepto" label="Concepto" placeholder="Ej. Pago planilla mayo 2026" />
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
              Vincular a un contrato (opcional)
            </label>
            <ComboBusqueda
              name="idContratoReferencia"
              placeholder="-- sin vincular --"
              opciones={contratos.map((c) => ({ value: String(c.ID_CONTRATO), label: `${c.NOMBRES} ${c.APELLIDOS} - ${c.CARGO}` }))}
            />
          </div>
          <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Registrando...">
            Registrar
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Movimientos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Concepto</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2 text-right">Saldo</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {movimientos.map((m) => (
                <tr key={m.ID_MOVIMIENTO}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(m.FECHA_MOVIMIENTO)}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        m.TIPO_MOVIMIENTO_CODIGO === "INGRESO"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      }`}
                    >
                      {m.TIPO_MOVIMIENTO_DESCRIPCION}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{m.CONCEPTO}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(m.MONTO, cuenta.MONEDA_CODIGO)}
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatearMonto(m.SALDO_RESULTANTE, cuenta.MONEDA_CODIGO)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {m.ID_MOVIMIENTO === ultimoMovimientoId ? (
                      <form action={eliminarMovimientoAction} className="inline-block">
                        <input type="hidden" name="idCuenta" value={cuenta.ID_CUENTA} />
                        <input type="hidden" name="idMovimiento" value={m.ID_MOVIMIENTO} />
                        <ConfirmSubmitButton
                          mensaje="¿Eliminar este movimiento? Solo se puede borrar el mas reciente."
                          className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          Quitar
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aún no hay movimientos.
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
