import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPlantilla, listarClausulasPlantilla } from "@/lib/db/repositories/plantilla-contrato.repository";
import {
  actualizarPlantillaAction,
  cambiarEstadoPlantillaAction,
  agregarClausulaPlantillaAction,
  actualizarClausulaPlantillaAction,
  eliminarClausulaPlantillaAction,
} from "@/lib/actions/rrhh";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import { TokensAyuda } from "@/components/rrhh/NuevaPlantillaForm";

export default async function DetallePlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("RRHH_CONTRATOS", "ADMIN");
  const { id } = await params;
  const idPlantilla = Number(id);

  const plantilla = await obtenerPlantilla(idPlantilla);
  if (!plantilla) notFound();

  const clausulas = await listarClausulasPlantilla(idPlantilla);
  const activa = plantilla.ESTADO_CODIGO === "ACTIVO";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{plantilla.NOMBRE}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {plantilla.TIPO_CONTRATO_DESCRIPCION}
            {plantilla.TIPO_PAGO_LOCADOR_DESCRIPCION ? ` - ${plantilla.TIPO_PAGO_LOCADOR_DESCRIPCION}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/contratos/plantillas/${plantilla.ID_PLANTILLA}/vista-previa`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ver ejemplo (PDF)
          </a>
          <form action={cambiarEstadoPlantillaAction}>
            <input type="hidden" name="idPlantilla" value={plantilla.ID_PLANTILLA} />
            <input type="hidden" name="activo" value={activa ? "0" : "1"} />
            <button
              type="submit"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                activa
                  ? "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {activa ? "Desactivar" : "Activar"}
            </button>
          </form>
        </div>
      </div>

      {!activa ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Esta plantilla esta inactiva: no se usara para generar contratos de este regimen hasta que la actives.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Datos generales</h2>
        <form action={actualizarPlantillaAction} className="mt-3 space-y-3">
          <input type="hidden" name="idPlantilla" value={plantilla.ID_PLANTILLA} />
          <Campo name="nombre" label="Nombre de la plantilla" defaultValue={plantilla.NOMBRE} />
          <Campo name="tituloDocumento" label="Titulo del documento" defaultValue={plantilla.TITULO_DOCUMENTO} />
          <div>
            <label htmlFor="parrafoIntro" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
              Parrafo de identificacion de las partes
            </label>
            <textarea
              id="parrafoIntro"
              name="parrafoIntro"
              rows={5}
              required
              defaultValue={plantilla.PARRAFO_INTRO}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <TokensAyuda />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        El logo que se imprime en el PDF es el mismo para todos los contratos y se administra desde{" "}
        <a href="/administracion/empresa" className="underline">
          Administracion → Empresa
        </a>{" "}
        (solo Super Admin).
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Clausulas</h2>
        <div className="mt-3 space-y-4">
          {clausulas.map((c) => (
            <form
              key={c.ID_CLAUSULA}
              action={actualizarClausulaPlantillaAction}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <input type="hidden" name="idPlantilla" value={plantilla.ID_PLANTILLA} />
              <input type="hidden" name="idClausula" value={c.ID_CLAUSULA} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[80px_1fr]">
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Orden</label>
                  <input
                    type="number"
                    name="orden"
                    defaultValue={c.ORDEN}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    Titulo (opcional, ej. &quot;PRIMERA: DEL OBJETO&quot;)
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    defaultValue={c.TITULO ?? ""}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Contenido</label>
                <textarea
                  name="contenido"
                  rows={4}
                  required
                  defaultValue={c.CONTENIDO}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            </form>
          ))}
          {clausulas.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Aun no hay clausulas.</p>
          ) : null}
        </div>

        {clausulas.length > 0 ? (
          <div className="mt-4 space-y-2">
            {clausulas.map((c) => (
              <form key={`del-${c.ID_CLAUSULA}`} action={eliminarClausulaPlantillaAction} className="inline-block">
                <input type="hidden" name="idPlantilla" value={plantilla.ID_PLANTILLA} />
                <input type="hidden" name="idClausula" value={c.ID_CLAUSULA} />
                <ConfirmSubmitButton
                  mensaje={`¿Eliminar la clausula "${c.TITULO ?? c.CONTENIDO.slice(0, 30)}"?`}
                  className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  Quitar &quot;{c.TITULO ?? c.CONTENIDO.slice(0, 30)}&quot;
                </ConfirmSubmitButton>
              </form>
            ))}
          </div>
        ) : null}

        <h3 className="mt-6 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Agregar clausula</h3>
        <form action={agregarClausulaPlantillaAction} className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <input type="hidden" name="idPlantilla" value={plantilla.ID_PLANTILLA} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[80px_1fr]">
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Orden</label>
              <input
                type="number"
                name="orden"
                defaultValue={(clausulas.at(-1)?.ORDEN ?? 0) + 10}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Titulo (opcional)</label>
              <input
                type="text"
                name="titulo"
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Contenido</label>
            <textarea
              name="contenido"
              rows={4}
              required
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Agregar
          </button>
        </form>
      </section>
    </div>
  );
}

function Campo({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
