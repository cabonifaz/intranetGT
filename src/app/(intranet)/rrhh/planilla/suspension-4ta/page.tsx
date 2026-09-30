import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { listarSuspension4ta } from "@/lib/db/repositories/rrhh-empleado.repository";
import Suspension4taForm from "@/components/rrhh/Suspension4taForm";
import IconoAlertaVencimiento, { diasHastaVencimiento, DIAS_SIGUIENTE_SEMANA } from "@/components/ui/IconoAlertaVencimiento";

const DIAS_ALERTA_VENCIMIENTO = 30;

function formatearFecha(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

// "Lugar" central para renovar cada año la suspension de Renta 4ta de
// todos los locadores con contrato vigente -- antes solo se podia
// cambiar entrando de a una persona a su ficha del Directorio, sin
// ninguna alerta de vencimiento ni constancia adjunta.
export default async function Suspension4taPage() {
  const sesion = await requirePermiso("RRHH_PLANILLA", "LECTURA");
  const permisos = await obtenerPermisosUsuario(sesion.idUsuario);
  const puedeGestionar = tienePermiso(permisos, "RRHH_PLANILLA", "ESCRITURA");

  const personas = await listarSuspension4ta();
  const hoy = new Date().toISOString().slice(0, 10);

  const sinSuspension = personas.filter((p) => !p.SUSPENSION_RETENCION_4TA_HASTA || p.SUSPENSION_RETENCION_4TA_HASTA < hoy);
  const porVencer = personas.filter(
    (p) =>
      p.SUSPENSION_RETENCION_4TA_HASTA &&
      p.SUSPENSION_RETENCION_4TA_HASTA >= hoy &&
      diasHastaVencimiento(p.SUSPENSION_RETENCION_4TA_HASTA) <= DIAS_ALERTA_VENCIMIENTO,
  );

  return (
    <div>
      <Link href="/rrhh/planilla" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Planilla Mensual
      </Link>
      <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Suspensión de Renta 4ta</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Se renueva cada año ante SUNAT -- sin esta suspensión vigente, el RxH descuenta el 8% de retención automáticamente.
        Personas con al menos un contrato de locación (no planilla) vigente hoy.
      </p>

      {sinSuspension.length > 0 ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
          <p className="font-medium text-red-800 dark:text-red-300">
            {sinSuspension.length} persona{sinSuspension.length === 1 ? "" : "s"} sin suspensión vigente -- se les está (o
            se les calculará) el descuento del 8% de Renta 4ta:
          </p>
          <ul className="mt-2 space-y-1 text-red-700 dark:text-red-400">
            {sinSuspension.map((p) => (
              <li key={p.ID_USUARIO}>
                {p.NOMBRES} {p.APELLIDOS}
                {p.SUSPENSION_RETENCION_4TA_HASTA ? ` -- venció el ${formatearFecha(p.SUSPENSION_RETENCION_4TA_HASTA)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {porVencer.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            {porVencer.length} suspensión{porVencer.length === 1 ? "" : "es"} por vencer en los próximos {DIAS_ALERTA_VENCIMIENTO}{" "}
            días:
          </p>
          <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-400">
            {porVencer.map((p) => (
              <li key={p.ID_USUARIO}>
                {p.NOMBRES} {p.APELLIDOS} -- vence el {formatearFecha(p.SUSPENSION_RETENCION_4TA_HASTA as string)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Colaborador</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Constancia</th>
              {puedeGestionar ? <th className="px-4 py-2">Renovar</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {personas.map((p) => {
              const vigente = Boolean(p.SUSPENSION_RETENCION_4TA_HASTA && p.SUSPENSION_RETENCION_4TA_HASTA >= hoy);
              const dias = p.SUSPENSION_RETENCION_4TA_HASTA ? diasHastaVencimiento(p.SUSPENSION_RETENCION_4TA_HASTA) : null;
              return (
                <tr key={p.ID_USUARIO}>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                    {p.NOMBRES} {p.APELLIDOS}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {vigente && dias !== null && dias <= DIAS_SIGUIENTE_SEMANA ? (
                        <IconoAlertaVencimiento dias={dias} fecha={p.SUSPENSION_RETENCION_4TA_HASTA as string} />
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          vigente
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {vigente ? `Vigente hasta ${formatearFecha(p.SUSPENSION_RETENCION_4TA_HASTA as string)}` : "Sin suspensión vigente"}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {p.SUSPENSION_RETENCION_4TA_PATH ? (
                      <a
                        href={`/api/rrhh/empleados/${p.ID_USUARIO}/suspension-4ta`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Ver constancia
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                  {puedeGestionar ? (
                    <td className="px-4 py-2">
                      <Suspension4taForm idUsuario={p.ID_USUARIO} compact />
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {personas.length === 0 ? (
              <tr>
                <td colSpan={puedeGestionar ? 4 : 3} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  No hay nadie con un contrato de locación vigente hoy.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
