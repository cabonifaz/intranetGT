import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarProyectos } from "@/lib/db/repositories/proyecto.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { calcularCosteo } from "@/lib/proyectos/costeo";
import BarraProgreso from "@/components/facturacion/BarraProgreso";

function formatearMonto(monto: number, monedaCodigo: string | null): string {
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requirePermiso("PROYECTOS_EMPRESA", "LECTURA");
  const { estado: estadoFiltro } = await searchParams;

  const [proyectos, estadosProyecto] = await Promise.all([
    listarProyectos(null, false),
    listarMaestros("ESTADO_PROYECTO"),
  ]);

  const proyectosFiltrados = estadoFiltro ? proyectos.filter((p) => p.ESTADO_PROYECTO_CODIGO === estadoFiltro) : proyectos;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Proyectos y Servicios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Costeo y margen: mano de obra, compras e ingresos por proyecto.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/facturacion/proyectos/clientes"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Clientes
          </Link>
          <Link
            href="/facturacion/cuentas-por-cobrar"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cuentas por cobrar
          </Link>
          <Link href="/facturacion/proyectos/nuevo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Nuevo proyecto
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FiltroEstado label="Todos" activo={!estadoFiltro} href="/facturacion/proyectos" />
        {estadosProyecto.map((e) => (
          <FiltroEstado
            key={e.ID_MAESTRO}
            label={e.DESCRIPCION}
            activo={estadoFiltro === e.CODIGO}
            href={`/facturacion/proyectos?estado=${e.CODIGO}`}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {proyectosFiltrados.map((p) => {
          const costeo = calcularCosteo(p);
          const margenNegativo = costeo.margenActual < 0;

          return (
            <Link
              key={p.ID_PROYECTO}
              href={`/facturacion/proyectos/${p.ID_PROYECTO}`}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{p.NOMBRE}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {p.ES_INTERNO === 1 ? "Proyecto interno (GT)" : (p.CLIENTE_RAZON_SOCIAL ?? "Sin cliente")} — {p.TIPO_PROYECTO_DESCRIPCION}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {p.ESTADO_PROYECTO_DESCRIPCION}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <BarraProgreso etiqueta="Costo a hoy vs presupuesto" valor={costeo.costoReal} total={costeo.costoPresupuestado} monedaCodigo={p.MONEDA_CODIGO} invertido />
                <BarraProgreso etiqueta="Ingreso a hoy vs esperado" valor={costeo.ingresoReal} total={costeo.ingresoEsperado} monedaCodigo={p.MONEDA_CODIGO} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Margen actual</p>
                  <p className={`font-medium ${margenNegativo ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>
                    {formatearMonto(costeo.margenActual, p.MONEDA_CODIGO)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Margen al cierre</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{formatearMonto(costeo.margenAlCierre, p.MONEDA_CODIGO)}</p>
                </div>
              </div>

              {Number(p.PASIVO_GENERADO) > 0 ? (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-600 dark:border-slate-800 dark:text-amber-400">
                  Pasivo generado: {formatearMonto(Number(p.PASIVO_GENERADO), p.MONEDA_CODIGO)}
                </p>
              ) : null}
            </Link>
          );
        })}
        {proyectosFiltrados.length === 0 ? (
          <p className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            {estadoFiltro ? "No hay proyectos con este estado." : "Aun no hay proyectos registrados."}
          </p>
        ) : null}
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
