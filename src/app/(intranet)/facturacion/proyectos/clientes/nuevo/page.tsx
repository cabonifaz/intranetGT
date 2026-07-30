import { requirePermiso } from "@/lib/auth/require-permiso";
import NuevoClienteForm from "@/components/facturacion/NuevoClienteForm";

export default async function NuevoClientePage() {
  await requirePermiso("PROYECTOS_EMPRESA", "ESCRITURA");

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nuevo cliente</h1>
      <NuevoClienteForm />
    </div>
  );
}
