import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarDeclaraciones } from "@/lib/db/repositories/declaracion-tributaria.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import PasosDeclaracion from "@/components/facturacion/PasosDeclaracion";

function formatearMonto(monto: string | number): string {
  const valor = Number(monto);
  const simbolo = valor < 0 ? "-S/ " : "S/ ";
  return `${simbolo}${Math.abs(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearPeriodo(anio: number, mes: number): string {
  if (mes === 0) return `${anio}`;
  const nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
  return `${nombres[mes - 1]} ${anio}`;
}

export default async function ImpuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; anio?: string }>;
}) {
  await requirePermiso("IMPUESTOS_EMPRESA", "LECTURA");
  const { tipo, anio } = await searchParams;
  const idTipoFiltro = tipo ? Number(tipo) : null;
  const anioFiltro = anio ? Number(anio) : null;

  const [declaraciones, tipos] = await Promise.all([
    listarDeclaraciones(idTipoFiltro, anioFiltro),
    listarMaestros("TIPO_DECLARACION_TRIBUTARIA"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Impuestos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Declaraciones mensuales de IGV/Renta (PDT 621) y Declaracion Jurada Anual de Renta.
          </p>
        </div>
        <Link href="/facturacion/impuestos/nueva" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Nueva declaracion
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-2 text-sm" action="/facturacion/impuestos">
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo</label>
          <select
            name="tipo"
            defaultValue={tipo ?? ""}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.ID_MAESTRO} value={t.ID_MAESTRO}>
                {t.DESCRIPCION}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Año</label>
          <input
            type="number"
            name="anio"
            defaultValue={anio ?? ""}
            placeholder="Ej. 2026"
            className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button type="submit" className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Filtrar
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">Vencimiento</th>
              <th className="px-4 py-2 text-right">Monto a pagar</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {declaraciones.map((d) => (
              <tr key={d.ID_DECLARACION}>
                <td className="px-4 py-2">
                  <Link href={`/facturacion/impuestos/${d.ID_DECLARACION}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {d.TIPO_DECLARACION_DESCRIPCION}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{formatearPeriodo(d.ANIO, d.MES)}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {new Date(`${d.FECHA_VENCIMIENTO}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" })}
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-200">{formatearMonto(d.MONTO_TOTAL_A_PAGAR)}</td>
                <td className="px-4 py-2">
                  <PasosDeclaracion
                    compact
                    datosCargados={d.MONTO_TOTAL_A_PAGAR !== null}
                    estadoCodigo={d.ESTADO_DECLARACION_CODIGO}
                    montoTotalAPagar={Number(d.MONTO_TOTAL_A_PAGAR)}
                    fechaPresentacion={d.FECHA_PRESENTACION}
                    fechaPago={d.FECHA_PAGO}
                  />
                </td>
              </tr>
            ))}
            {declaraciones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aún no hay declaraciones registradas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
