import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { listarAreas } from "@/lib/db/repositories/area.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { COLOR_TIPO_CONTACTO, BADGE_TIPO_CONTACTO, COLOR_PERSONAL_GT } from "@/lib/directorio/tipo-contacto";
import type { TipoRelacionContactoCodigo } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

export default async function DirectorioPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; q?: string; vista?: string; tipo?: string }>;
}) {
  await requirePermiso("RRHH_DIRECTORIO", "LECTURA");

  const { area, q, vista, tipo } = await searchParams;
  const idArea = area ? Number(area) : null;
  const busqueda = q?.trim() || null;
  const vistaClientes = vista === "clientes";
  const tipoCodigo = (tipo?.trim() || null) as TipoRelacionContactoCodigo | null;

  const [empleados, areas, tiposRelacion, contactosSinFiltrar] = await Promise.all([
    vistaClientes ? Promise.resolve([]) : listarDirectorio(idArea, busqueda),
    listarAreas(true),
    listarMaestros("TIPO_RELACION_CONTACTO"),
    vistaClientes ? listarTodosLosContactosExternos(busqueda) : Promise.resolve([]),
  ]);

  const contactos = tipoCodigo ? contactosSinFiltrar.filter((c) => c.TIPO_RELACION_CODIGO === tipoCodigo) : contactosSinFiltrar;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Directorio Corporativo</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {vistaClientes ? "Contactos externos: clientes, proveedores y socios comerciales." : "Contacto y puesto de las personas de la empresa."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/rrhh/directorio"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              !vistaClientes ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Personal GT
          </Link>
          <Link
            href="/rrhh/directorio?vista=clientes"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              vistaClientes ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Contactos externos
          </Link>
        </div>
        {vistaClientes ? (
          <Link href="/rrhh/directorio/contactos/nuevo" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            Nuevo contacto
          </Link>
        ) : null}
      </div>

      {vistaClientes ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/rrhh/directorio?vista=clientes"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              !tipoCodigo ? "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Todos
          </Link>
          {tiposRelacion.map((t) => (
            <Link
              key={t.ID_MAESTRO}
              href={`/rrhh/directorio?vista=clientes&tipo=${t.CODIGO}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                tipoCodigo === t.CODIGO ? "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {t.DESCRIPCION}
            </Link>
          ))}
        </div>
      ) : null}

      <form className="mt-4 flex flex-wrap gap-3" action="/rrhh/directorio">
        {vistaClientes ? <input type="hidden" name="vista" value="clientes" /> : null}
        {vistaClientes && tipoCodigo ? <input type="hidden" name="tipo" value={tipoCodigo} /> : null}
        <input
          type="text"
          name="q"
          defaultValue={busqueda ?? ""}
          placeholder={vistaClientes ? "Buscar por nombre, cargo o empresa..." : "Buscar por nombre o puesto..."}
          className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        {!vistaClientes ? (
          <div className="w-56">
            <ComboBusqueda
              name="area"
              placeholder="Todas las areas"
              defaultValue={idArea ? String(idArea) : ""}
              opciones={areas.map((a) => ({ value: String(a.ID_AREA), label: a.NOMBRE }))}
            />
          </div>
        ) : null}
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Buscar
        </button>
      </form>

      {vistaClientes ? (
        contactos.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">No se encontraron contactos.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contactos.map((c) => (
              <Link
                key={c.ID_CONTACTO}
                href={`/rrhh/directorio/contactos/${c.ID_CONTACTO}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${COLOR_TIPO_CONTACTO[c.TIPO_RELACION_CODIGO]}`}>
                  {c.NOMBRES[0]}
                  {c.APELLIDOS[0]}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">
                  {c.NOMBRES} {c.APELLIDOS}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{c.CARGO ?? "Cargo no registrado"}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{c.EMPRESA_NOMBRE}</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${BADGE_TIPO_CONTACTO[c.TIPO_RELACION_CODIGO]}`}>
                  {c.TIPO_RELACION_DESCRIPCION}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : empleados.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">No se encontraron personas.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {empleados.map((e) => (
            <Link
              key={e.ID_USUARIO}
              href={`/rrhh/directorio/${e.ID_USUARIO}`}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${COLOR_PERSONAL_GT}`}>
                {e.NOMBRES[0]}
                {e.APELLIDOS[0]}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">
                {e.NOMBRES} {e.APELLIDOS}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{e.ROL_NOMBRE ?? "Puesto no registrado"}</p>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{e.AREA_NOMBRE ?? "Sin area"}</p>
              <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                Personal GT
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
