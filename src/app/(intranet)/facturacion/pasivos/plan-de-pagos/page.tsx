import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarCuotasPendientes } from "@/lib/db/repositories/pasivo.repository";
import { calcularProyeccion } from "@/lib/pasivos/proyeccion";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function PlanDePagosPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>;
}) {
  await requirePermiso("PASIVOS_EMPRESA", "LECTURA");
  const { cuenta: idCuentaFiltro } = await searchParams;

  const cuotas = await listarCuotasPendientes();
  const cuotasFiltradas = idCuentaFiltro
    ? cuotas.filter((c) => String(c.ID_CUENTA_PAGO) === idCuentaFiltro)
    : cuotas;
  const grupos = calcularProyeccion(cuotasFiltradas);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Plan de pagos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cuotas pendientes ordenadas por vencimiento, proyectadas contra el saldo de cada cuenta.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/pasivos/plan-de-pagos/pdf${idCuentaFiltro ? `?cuenta=${idCuentaFiltro}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Descargar PDF
          </a>
          <Link
            href="/facturacion/pasivos"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ver pasivos
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {grupos.map((grupo) => (
          <section key={grupo.idCuenta ?? "sin-cuenta"} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{grupo.nombre}</h2>
              {grupo.saldoActual !== null ? (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Saldo actual: {formatearMonto(grupo.saldoActual, grupo.monedaCodigo)}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">Asigna una cuenta a estas cuotas para proyectar</span>
              )}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-2 py-2">Acreedor</th>
                    <th className="px-2 py-2">Cuota</th>
                    <th className="px-2 py-2">Vencimiento</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2 text-right">Monto</th>
                    {grupo.saldoActual !== null ? <th className="px-2 py-2 text-right">Saldo proyectado</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {grupo.cuotas.map((c) => (
                    <tr key={c.ID_CUOTA} className={c.saldoProyectado < 0 ? "bg-red-50 dark:bg-red-950/20" : ""}>
                      <td className="px-2 py-2">
                        <Link href={`/facturacion/pasivos/${c.ID_PASIVO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                          {c.ACREEDOR}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.NRO_CUOTA}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(c.FECHA_VENCIMIENTO)}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            c.ESTADO_CUOTA_CODIGO === "PROTESTADA"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {c.ESTADO_CUOTA_DESCRIPCION}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(c.MONTO, grupo.monedaCodigo)}</td>
                      {grupo.saldoActual !== null ? (
                        <td className={`px-2 py-2 text-right font-medium ${c.saldoProyectado < 0 ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>
                          {formatearMonto(c.saldoProyectado, grupo.monedaCodigo)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {grupos.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            No hay cuotas pendientes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
