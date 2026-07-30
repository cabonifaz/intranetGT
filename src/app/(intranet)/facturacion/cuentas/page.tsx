import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function CuentasPage() {
  await requirePermiso("CUENTAS_EMPRESA", "LECTURA");

  const cuentas = await listarCuentas(null, false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Cuentas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cuentas bancarias de la empresa (soles, dólares, detracciones) y saldos a favor de IGV/Renta.
          </p>
        </div>
        <Link href="/facturacion/cuentas/nueva" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Nueva cuenta
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Banco</th>
              <th className="px-4 py-2">N° cuenta</th>
              <th className="px-4 py-2 text-right">Saldo actual</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {cuentas.map((c) => (
              <tr key={c.ID_CUENTA}>
                <td className="px-4 py-2">
                  <Link
                    href={`/facturacion/cuentas/${c.ID_CUENTA}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {c.NOMBRE}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.TIPO_CUENTA_DESCRIPCION}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.BANCO_DESCRIPCION ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.NRO_CUENTA ?? "-"}</td>
                <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                  {formatearMonto(c.SALDO_ACTUAL, c.MONEDA_CODIGO)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.ESTADO_CODIGO === "ACTIVO"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {c.ESTADO_CODIGO === "ACTIVO" ? "Activa" : "Inactiva"}
                  </span>
                </td>
              </tr>
            ))}
            {cuentas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aún no hay cuentas registradas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
