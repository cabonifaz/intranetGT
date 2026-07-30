import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarPlantillas } from "@/lib/db/repositories/plantilla-contrato.repository";

export default async function PlantillasContratoPage() {
  await requirePermiso("RRHH_CONTRATOS", "ADMIN");

  const plantillas = await listarPlantillas();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Plantillas de contrato</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Maestro de contratos: el contenido base (clausulas, logo) que se usa para generar cada contrato segun su
            regimen.
          </p>
        </div>
        <Link
          href="/rrhh/contratos/plantillas/nueva"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva plantilla
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Regimen</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {plantillas.map((p) => (
              <tr key={p.ID_PLANTILLA}>
                <td className="px-4 py-2">
                  <Link
                    href={`/rrhh/contratos/plantillas/${p.ID_PLANTILLA}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {p.NOMBRE}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {p.TIPO_CONTRATO_DESCRIPCION}
                  {p.TIPO_PAGO_LOCADOR_DESCRIPCION ? ` - ${p.TIPO_PAGO_LOCADOR_DESCRIPCION}` : ""}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.ESTADO_CODIGO === "ACTIVO"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {p.ESTADO_CODIGO === "ACTIVO" ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={`/api/contratos/plantillas/${p.ID_PLANTILLA}/vista-previa`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Ver ejemplo (PDF)
                  </a>
                </td>
              </tr>
            ))}
            {plantillas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aun no hay plantillas. Crea una por cada regimen antes de poder generar contratos de ese tipo.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
