import Link from "next/link";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import CrearMaestroForm from "@/components/administracion/CrearMaestroForm";

const TIPOS_CONOCIDOS = [
  "ESTADO_GENERAL",
  "ESTADO_USUARIO",
  "ESTADO_SESION",
  "DIA_SEMANA",
  "TIPO_APLICACION",
  "NIVEL_PERMISO",
  "CATEGORIA_NOTIFICACION",
  "TIPO_DOCUMENTO_IDENTIDAD",
  "PAIS",
  "CIUDAD",
  "BANCO",
];

export default async function MaestrosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const tipoActivo = tipo && TIPOS_CONOCIDOS.includes(tipo) ? tipo : TIPOS_CONOCIDOS[0];
  const esCiudad = tipoActivo === "CIUDAD";

  const [valores, paises] = await Promise.all([
    listarMaestros(tipoActivo, false),
    esCiudad ? listarMaestros("PAIS") : Promise.resolve([]),
  ]);
  const paisPorId = new Map(paises.map((p) => [p.ID_MAESTRO, p.DESCRIPCION]));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          {TIPOS_CONOCIDOS.map((t) => (
            <Link
              key={t}
              href={`/administracion/maestros?tipo=${t}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                t === tipoActivo
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Codigo</th>
                <th className="px-4 py-2">Descripcion</th>
                {esCiudad ? <th className="px-4 py-2">Pais</th> : null}
                <th className="px-4 py-2">Orden</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {valores.map((v) => (
                <tr key={v.ID_MAESTRO}>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{v.CODIGO}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{v.DESCRIPCION}</td>
                  {esCiudad ? (
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {(v.ID_PADRE && paisPorId.get(v.ID_PADRE)) ?? "-"}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{v.ORDEN}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {v.ESTADO_CODIGO}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <CrearMaestroForm key={tipoActivo} tipoActivo={tipoActivo} esCiudad={esCiudad} paises={paises} />
      </div>
    </div>
  );
}
