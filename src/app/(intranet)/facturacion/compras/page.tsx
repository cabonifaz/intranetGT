import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarCompras } from "@/lib/db/repositories/compra.repository";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function ComprasPage() {
  await requirePermiso("COMPRAS_EMPRESA", "LECTURA");

  const compras = await listarCompras();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Compras</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Compras a proveedores y su estado de pago.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/facturacion/compras/proveedores"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Proveedores
          </Link>
          <Link
            href="/facturacion/cuentas-por-pagar"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cuentas por pagar
          </Link>
          <Link href="/facturacion/compras/nueva" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Nueva compra
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Descripcion</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Pagado</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {compras.map((c) => (
              <tr key={c.ID_COMPRA}>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.PROVEEDOR_RAZON_SOCIAL}</td>
                <td className="px-4 py-2">
                  <Link href={`/facturacion/compras/${c.ID_COMPRA}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {c.DESCRIPCION}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(c.FECHA_COMPRA)}</td>
                <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(c.MONTO_TOTAL, c.MONEDA_CODIGO)}</td>
                <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(c.MONTO_PAGADO, c.MONEDA_CODIGO)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.ESTADO_COMPRA_CODIGO === "PAGADA"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : c.ESTADO_COMPRA_CODIGO === "PARCIAL"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {c.ESTADO_COMPRA_DESCRIPCION}
                  </span>
                </td>
              </tr>
            ))}
            {compras.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aun no hay compras registradas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
