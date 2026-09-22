import Link from "next/link";
import { requirePermiso, puedeGestionarPrestamos } from "@/lib/auth/require-permiso";
import { listarPrestamos } from "@/lib/db/repositories/rrhh-prestamo.repository";

function formatearMonto(monto: string | number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function PrestamosPage() {
  const sesion = await requirePermiso("RRHH_PLANILLA", "LECTURA");
  const puedeGestionar = await puedeGestionarPrestamos(sesion.idUsuario);

  const prestamos = await listarPrestamos(null);
  const solicitudes = prestamos.filter((p) => p.ESTADO_PRESTAMO_CODIGO === "SOLICITADO");
  const pendientesFirma = prestamos.filter((p) => p.ESTADO_PRESTAMO_CODIGO === "PENDIENTE_FIRMA").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rrhh/planilla" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            &larr; Planilla Mensual
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Préstamos y adelantos de sueldo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Préstamos y adelantos de sueldo con cronograma de cuotas que se descuentan en la Planilla Mensual, previa firma del compromiso.
          </p>
        </div>
        {puedeGestionar ? (
          <Link
            href="/rrhh/planilla/prestamos/nuevo"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Nuevo préstamo / adelanto
          </Link>
        ) : null}
      </div>

      {solicitudes.length > 0 ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {solicitudes.length} solicitud{solicitudes.length === 1 ? "" : "es"} pendiente{solicitudes.length === 1 ? "" : "s"} de otorgar
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {solicitudes.map((s) => (
              <li key={s.ID_PRESTAMO}>
                <Link href={`/rrhh/planilla/prestamos/${s.ID_PRESTAMO}`} className="text-blue-700 hover:underline dark:text-blue-400">
                  {s.NOMBRES} {s.APELLIDOS} -- {s.TIPO_PRESTAMO_DESCRIPCION} de {formatearMonto(s.MONTO_TOTAL, s.MONEDA_CODIGO)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pendientesFirma > 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {pendientesFirma} registro{pendientesFirma === 1 ? "" : "s"} con el compromiso de pago sin firmar -- mientras no se
          suba el compromiso firmado, sus cuotas no se descuentan en planilla.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Beneficiario</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2 text-right">Monto</th>
              <th className="px-4 py-2 text-right">Descontado</th>
              <th className="px-4 py-2 text-right">Pendiente</th>
              <th className="px-4 py-2 text-right">Cuotas</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {prestamos.map((p) => (
              <tr key={p.ID_PRESTAMO}>
                <td className="px-4 py-2">
                  <Link href={`/rrhh/planilla/prestamos/${p.ID_PRESTAMO}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {p.NOMBRES} {p.APELLIDOS}
                  </Link>
                  {p.ES_CONTACTO ? (
                    <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Contacto
                    </span>
                  ) : null}
                  {p.DESCRIPCION ? <p className="text-xs text-slate-500 dark:text-slate-400">{p.DESCRIPCION}</p> : null}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.TIPO_PRESTAMO_DESCRIPCION}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(p.FECHA_ORIGEN)}</td>
                <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-200">{formatearMonto(p.MONTO_TOTAL, p.MONEDA_CODIGO)}</td>
                <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{formatearMonto(p.MONTO_DESCONTADO, p.MONEDA_CODIGO)}</td>
                <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{formatearMonto(p.MONTO_PENDIENTE, p.MONEDA_CODIGO)}</td>
                <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{p.TOTAL_CUOTAS}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.ESTADO_PRESTAMO_CODIGO === "ACTIVO"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : p.ESTADO_PRESTAMO_CODIGO === "ANULADO"
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}
                  >
                    {p.ESTADO_PRESTAMO_DESCRIPCION}
                  </span>
                </td>
              </tr>
            ))}
            {prestamos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aún no hay préstamos registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
