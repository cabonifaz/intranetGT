import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import NuevaDeclaracionForm from "@/components/facturacion/NuevaDeclaracionForm";

export default async function NuevaDeclaracionPage() {
  await requirePermiso("IMPUESTOS_EMPRESA", "ESCRITURA");

  const tipos = await listarMaestros("TIPO_DECLARACION_TRIBUTARIA");

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nueva declaracion</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Si ya existe una declaracion para ese tipo y periodo, te lleva directo a ella en vez de crear una duplicada.
      </p>
      <div className="mt-4">
        <NuevaDeclaracionForm tipos={tipos} />
      </div>
    </div>
  );
}
