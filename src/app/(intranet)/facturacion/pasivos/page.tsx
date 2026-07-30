import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarPasivos } from "@/lib/db/repositories/pasivo.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

function formatearFechaHora(fecha: string): string {
  return new Date(fecha).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

export default async function PasivosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requirePermiso("PASIVOS_EMPRESA", "LECTURA");
  const { estado: estadoFiltro } = await searchParams;

  const [pasivos, estadosPasivo] = await Promise.all([
    listarPasivos(null, false),
    listarMaestros("ESTADO_PASIVO"),
  ]);

  const pasivosFiltrados = estadoFiltro ? pasivos.filter((p) => p.ESTADO_PASIVO_CODIGO === estadoFiltro) : pasivos;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Pasivos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Deudas, prestamos, lineas de credito y letras protestadas de la empresa.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/facturacion/pasivos/plan-de-pagos"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Plan de pagos
          </Link>
          <Link href="/facturacion/pasivos/nuevo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Nuevo pasivo
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FiltroEstado label="Todos" activo={!estadoFiltro} href="/facturacion/pasivos" />
        {estadosPasivo.map((e) => (
          <FiltroEstado
            key={e.ID_MAESTRO}
            label={e.DESCRIPCION}
            activo={estadoFiltro === e.CODIGO}
            href={`/facturacion/pasivos?estado=${e.CODIGO}`}
          />
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Acreedor</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Financia</th>
              <th className="px-4 py-2">Origen</th>
              <th className="px-4 py-2 text-right">Monto total</th>
              <th className="px-4 py-2 text-right">Pendiente</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pasivosFiltrados.map((p) => (
              <tr key={p.ID_PASIVO}>
                <td className="px-4 py-2">
                  <Link href={`/facturacion/pasivos/${p.ID_PASIVO}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {p.ACREEDOR}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.TIPO_PASIVO_DESCRIPCION}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.FINANCIA_DESCRIPCION ?? p.DESCRIPCION ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(p.FECHA_ORIGEN)}</td>
                <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(p.MONTO_TOTAL, p.MONEDA_CODIGO)}</td>
                <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                  {formatearMonto(p.MONTO_PENDIENTE, p.MONEDA_CODIGO)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    title={
                      p.ESTADO_PASIVO_CODIGO === "ANULADO" && p.MOTIVO_ANULACION
                        ? `Anulado por ${p.ANULADO_POR ?? "usuario desconocido"} el ${formatearFechaHora(p.FECHA_ANULACION ?? "")} — ${p.MOTIVO_ANULACION}`
                        : undefined
                    }
                  >
                    {p.ESTADO_PASIVO_DESCRIPCION}
                  </span>
                </td>
              </tr>
            ))}
            {pasivosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {estadoFiltro ? "No hay pasivos con este estado." : "Aun no hay pasivos registrados."}
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
