import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarProveedores } from "@/lib/db/repositories/compra.repository";

export default async function ProveedoresPage() {
  await requirePermiso("COMPRAS_EMPRESA", "LECTURA");

  const proveedores = await listarProveedores(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Proveedores</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Catalogo de proveedores de bienes y servicios.</p>
        </div>
        <Link href="/facturacion/compras/proveedores/nuevo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Nuevo proveedor
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Razon social</th>
              <th className="px-4 py-2">RUC</th>
              <th className="px-4 py-2">Contacto</th>
              <th className="px-4 py-2">Telefono</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {proveedores.map((p) => (
              <tr key={p.ID_PROVEEDOR}>
                <td className="px-4 py-2">
                  <Link href={`/facturacion/compras/proveedores/${p.ID_PROVEEDOR}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {p.RAZON_SOCIAL}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.RUC ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.NOMBRE_CONTACTO ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.TELEFONO ?? "-"}</td>
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
            ))}
            {proveedores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aun no hay proveedores registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
