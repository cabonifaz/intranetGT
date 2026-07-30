import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarPagosRecurrentes, listarInstanciasPendientes } from "@/lib/db/repositories/pago-recurrente.repository";
import type { InstanciaPendienteRow } from "@/types/db";
import IconoAlertaVencimiento, {
  diasHastaVencimiento,
  DIAS_PROXIMOS,
  DIAS_SIGUIENTE_SEMANA,
} from "@/components/ui/IconoAlertaVencimiento";

const DIAS_ALERTA_VENCIMIENTO = 30;

function formatearMonto(monto: string | number | null, monedaCodigo: string | null): string {
  if (monto === null) return "Variable";
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearIntervalo(intervaloMeses: number): string {
  if (intervaloMeses === 1) return "Mensual";
  if (intervaloMeses === 3) return "Trimestral";
  if (intervaloMeses === 6) return "Semestral";
  if (intervaloMeses === 12) return "Anual";
  return `Cada ${intervaloMeses} meses`;
}

export default async function PagosRecurrentesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requirePermiso("PAGOS_RECURRENTES", "LECTURA");
  const { estado: estadoFiltro } = await searchParams;

  const [pagos, pendientes] = await Promise.all([listarPagosRecurrentes(false), listarInstanciasPendientes()]);

  const pagosFiltrados =
    estadoFiltro === "INACTIVO" ? pagos.filter((p) => p.ESTADO_CODIGO === "INACTIVO") : pagos.filter((p) => p.ESTADO_CODIGO === "ACTIVO");
  const mostrarTodos = estadoFiltro === "TODOS";
  const pagosMostrados = mostrarTodos ? pagos : pagosFiltrados;

  const proximosDias = pendientes.filter((i) => diasHastaVencimiento(i.FECHA_VENCIMIENTO) <= DIAS_PROXIMOS);
  const siguienteSemana = pendientes.filter(
    (i) => diasHastaVencimiento(i.FECHA_VENCIMIENTO) > DIAS_PROXIMOS && diasHastaVencimiento(i.FECHA_VENCIMIENTO) <= DIAS_SIGUIENTE_SEMANA,
  );
  const dentroDelMes = pendientes.filter(
    (i) =>
      diasHastaVencimiento(i.FECHA_VENCIMIENTO) > DIAS_SIGUIENTE_SEMANA &&
      diasHastaVencimiento(i.FECHA_VENCIMIENTO) <= DIAS_ALERTA_VENCIMIENTO,
  );

  const proximaInstanciaPorPago = new Map<number, InstanciaPendienteRow>();
  for (const i of pendientes) {
    if (!proximaInstanciaPorPago.has(i.ID_PAGO_RECURRENTE)) proximaInstanciaPorPago.set(i.ID_PAGO_RECURRENTE, i);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Pagos recurrentes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cronograma de gastos que se repiten periodo tras periodo (alquiler, internet, software, seguros...).
          </p>
        </div>
        <Link href="/facturacion/pagos-recurrentes/nuevo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Nuevo pago recurrente
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        <AlertaInstancias
          titulo="Vencen en los próximos días"
          instancias={proximosDias}
          colores="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          coloresTexto="text-red-800 dark:text-red-300"
          coloresEnlace="text-red-700 hover:underline dark:text-red-400"
        />
        <AlertaInstancias
          titulo="Vencen la siguiente semana"
          instancias={siguienteSemana}
          colores="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          coloresTexto="text-amber-800 dark:text-amber-300"
          coloresEnlace="text-amber-700 hover:underline dark:text-amber-400"
        />
        <AlertaInstancias
          titulo="Vencen dentro del mes"
          instancias={dentroDelMes}
          colores="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
          coloresTexto="text-blue-800 dark:text-blue-300"
          coloresEnlace="text-blue-700 hover:underline dark:text-blue-400"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FiltroEstado label="Activos" activo={!estadoFiltro} href="/facturacion/pagos-recurrentes" />
        <FiltroEstado label="Inactivos" activo={estadoFiltro === "INACTIVO"} href="/facturacion/pagos-recurrentes?estado=INACTIVO" />
        <FiltroEstado label="Todos" activo={mostrarTodos} href="/facturacion/pagos-recurrentes?estado=TODOS" />
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Frecuencia</th>
              <th className="px-4 py-2 text-right">Monto</th>
              <th className="px-4 py-2">Proyecto</th>
              <th className="px-4 py-2">Cuenta default</th>
              <th className="px-4 py-2">Proximo vencimiento</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagosMostrados.map((p) => {
              const proxima = proximaInstanciaPorPago.get(p.ID_PAGO_RECURRENTE);
              return (
                <tr key={p.ID_PAGO_RECURRENTE}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/facturacion/pagos-recurrentes/${p.ID_PAGO_RECURRENTE}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {p.NOMBRE}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{formatearIntervalo(p.INTERVALO_MESES)}</td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatearMonto(p.ES_VARIABLE ? null : p.MONTO_FIJO, p.MONEDA_CODIGO)}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.PROYECTO_NOMBRE ?? "Administrativo"}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.CUENTA_PAGO_DEFAULT_NOMBRE ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {proxima ? (
                      <span className="inline-flex items-center gap-1.5">
                        {new Date(`${proxima.FECHA_VENCIMIENTO}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" })}
                        <IconoAlertaVencimiento
                          dias={diasHastaVencimiento(proxima.FECHA_VENCIMIENTO)}
                          fecha={proxima.FECHA_VENCIMIENTO}
                        />
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.ESTADO_CODIGO === "ACTIVO"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {p.ESTADO_CODIGO === "ACTIVO" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {pagosMostrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  No hay pagos recurrentes registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FiltroEstado({ label, activo, href }: { label: string; activo: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        activo
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}

function AlertaInstancias({
  titulo,
  instancias,
  colores,
  coloresTexto,
  coloresEnlace,
}: {
  titulo: string;
  instancias: InstanciaPendienteRow[];
  colores: string;
  coloresTexto: string;
  coloresEnlace: string;
}) {
  if (instancias.length === 0) return null;

  return (
    <div className={`rounded-xl border p-4 ${colores}`}>
      <p className={`text-sm font-medium ${coloresTexto}`}>
        {instancias.length} pago(s) {titulo.toLowerCase()}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {instancias.map((i) => (
          <li key={i.ID_INSTANCIA}>
            <Link href={`/facturacion/pagos-recurrentes/${i.ID_PAGO_RECURRENTE}`} className={coloresEnlace}>
              {i.PAGO_RECURRENTE_NOMBRE} - {i.PERIODO} (vence{" "}
              {new Date(`${i.FECHA_VENCIMIENTO}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" })})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
