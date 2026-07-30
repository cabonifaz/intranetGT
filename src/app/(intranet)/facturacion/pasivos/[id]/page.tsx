import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPasivo, listarCuotas } from "@/lib/db/repositories/pasivo.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { listarProveedores } from "@/lib/db/repositories/compra.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { actualizarPasivoAction, anularPasivoAction, agregarCuotaAction } from "@/lib/actions/pasivos";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import CuotaFilaAcciones from "@/components/facturacion/CuotaFilaAcciones";
import SelectorAcreedorPasivo from "@/components/facturacion/SelectorAcreedorPasivo";
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

export default async function DetallePasivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("PASIVOS_EMPRESA", "LECTURA");
  const { id } = await params;
  const idPasivo = Number(id);

  const pasivo = await obtenerPasivo(idPasivo);
  if (!pasivo) notFound();

  const [cuotas, cuentas, proveedores, contactos, personal] = await Promise.all([
    listarCuotas(idPasivo),
    listarCuentas(),
    listarProveedores(),
    listarTodosLosContactosExternos(null),
    listarDirectorio(null, null),
  ]);

  const activo = pasivo.ESTADO_PASIVO_CODIGO === "ACTIVO";
  const siguienteNroCuota = cuotas.length > 0 ? Math.max(...cuotas.map((c) => c.NRO_CUOTA)) + 1 : 1;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{pasivo.ACREEDOR}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {pasivo.TIPO_PASIVO_DESCRIPCION} — {pasivo.ESTADO_PASIVO_DESCRIPCION}
          </p>
        </div>
        {activo ? (
          <form action={anularPasivoAction}>
            <input type="hidden" name="idPasivo" value={pasivo.ID_PASIVO} />
            <ConfirmSubmitButton
              mensaje="¿Anular este pasivo? Solo se puede si ninguna cuota fue pagada todavia."
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Anular
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Monto total" valor={formatearMonto(pasivo.MONTO_TOTAL, pasivo.MONEDA_CODIGO)} />
          {pasivo.TIPO_CAMBIO ? <Dato etiqueta="Tipo de cambio" valor={pasivo.TIPO_CAMBIO} /> : null}
          {pasivo.DESCRIPCION ? <Dato etiqueta="Motivo" valor={pasivo.DESCRIPCION} /> : null}
          <Dato etiqueta="Fecha de origen" valor={formatearFecha(pasivo.FECHA_ORIGEN)} />
          {pasivo.NRO_OPERACION ? <Dato etiqueta="N° de operacion/letra" valor={pasivo.NRO_OPERACION} /> : null}
          {pasivo.TASA_INTERES ? <Dato etiqueta="Tasa de interes" valor={`${pasivo.TASA_INTERES}%`} /> : null}
          {pasivo.TIPO_REFERENCIA ? (
            <Dato etiqueta="Financia" valor={pasivo.FINANCIA_DESCRIPCION ?? `${pasivo.TIPO_REFERENCIA} #${pasivo.ID_REFERENCIA}`} />
          ) : null}
          {pasivo.PROYECTO_NOMBRE ? (
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Proyecto</dt>
              <dd className="text-slate-800 dark:text-slate-200">
                <Link href={`/facturacion/proyectos/${pasivo.ID_PROYECTO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {pasivo.PROYECTO_NOMBRE}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        <form action={actualizarPasivoAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <input type="hidden" name="idPasivo" value={pasivo.ID_PASIVO} />
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Acreedor</label>
            <SelectorAcreedorPasivo
              proveedores={proveedores}
              contactos={contactos}
              personal={personal}
              defaultIdProveedor={pasivo.ID_PROVEEDOR}
              defaultIdContacto={pasivo.ID_CONTACTO}
              defaultIdUsuario={pasivo.ID_USUARIO}
            />
          </div>
          <Campo name="descripcion" label="Descripcion" defaultValue={pasivo.DESCRIPCION ?? ""} required={false} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="nroOperacion" label="N° de operacion/letra" defaultValue={pasivo.NRO_OPERACION ?? ""} required={false} />
            <Campo name="tasaInteres" label="Tasa de interes %" type="number" defaultValue={pasivo.TASA_INTERES ?? ""} required={false} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de pago por defecto</label>
            <ComboBusqueda
              name="idCuentaPago"
              placeholder="-- sin asignar --"
              defaultValue={pasivo.ID_CUENTA_PAGO ? String(pasivo.ID_CUENTA_PAGO) : ""}
              opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
            />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Agregar cuota</h2>
        <form action={agregarCuotaAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="idPasivo" value={pasivo.ID_PASIVO} />
          <Campo name="nroCuota" label="N° de cuota" type="number" defaultValue={String(siguienteNroCuota)} />
          <Campo name="fechaVencimiento" label="Fecha de vencimiento" type="date" />
          <Campo name="monto" label="Monto" type="number" />
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Cuenta de pago (opcional)</label>
            <ComboBusqueda
              name="idCuentaPago"
              placeholder="-- hereda la del pasivo --"
              defaultValue={pasivo.ID_CUENTA_PAGO ? String(pasivo.ID_CUENTA_PAGO) : ""}
              opciones={cuentas.map((c) => ({ value: String(c.ID_CUENTA), label: c.NOMBRE }))}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Agregar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Cuotas</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">N°</th>
                <th className="px-2 py-2">Vencimiento</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2">Cuenta</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cuotas.map((c) => (
                <tr key={c.ID_CUOTA}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.NRO_CUOTA}</td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(c.FECHA_VENCIMIENTO)}</td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(c.MONTO, pasivo.MONEDA_CODIGO)}</td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.CUENTA_PAGO_NOMBRE ?? "-"}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        c.ESTADO_CUOTA_CODIGO === "PAGADA"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : c.ESTADO_CUOTA_CODIGO === "PROTESTADA"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : c.ESTADO_CUOTA_CODIGO === "ANULADA"
                              ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}
                    >
                      {c.ESTADO_CUOTA_DESCRIPCION}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <CuotaFilaAcciones cuota={c} idPasivo={pasivo.ID_PASIVO} acreedor={pasivo.ACREEDOR} cuentas={cuentas} />
                  </td>
                </tr>
              ))}
              {cuotas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay cuotas registradas.
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
