import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarClientes } from "@/lib/db/repositories/proyecto.repository";
import NuevoProyectoForm from "@/components/facturacion/NuevoProyectoForm";

export default async function NuevoProyectoPage() {
  await requirePermiso("PROYECTOS_EMPRESA", "ESCRITURA");

  const [tiposProyecto, monedas, clientes] = await Promise.all([
    listarMaestros("TIPO_PROYECTO"),
    listarMaestros("MONEDA"),
    listarClientes(),
  ]);

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nuevo proyecto</h1>
        <Link href="/facturacion/proyectos/clientes" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Administrar clientes
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        El costo presupuestado y el ingreso esperado son los que ya se acordaron con el cliente -- se usan para
        calcular el margen al cierre.
      </p>
      <NuevoProyectoForm tiposProyecto={tiposProyecto} monedas={monedas} clientes={clientes} />
    </div>
  );
}
