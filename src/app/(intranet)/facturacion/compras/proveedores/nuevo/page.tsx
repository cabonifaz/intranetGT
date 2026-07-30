import { requirePermiso } from "@/lib/auth/require-permiso";
import NuevoProveedorForm from "@/components/facturacion/NuevoProveedorForm";

export default async function NuevoProveedorPage() {
  await requirePermiso("COMPRAS_EMPRESA", "ESCRITURA");

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nuevo proveedor</h1>
      <NuevoProveedorForm />
    </div>
  );
}
