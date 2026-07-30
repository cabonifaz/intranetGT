import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarProveedores } from "@/lib/db/repositories/compra.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarProyectos } from "@/lib/db/repositories/proyecto.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import NuevaCompraForm from "@/components/facturacion/NuevaCompraForm";

export default async function NuevaCompraPage() {
  await requirePermiso("COMPRAS_EMPRESA", "ESCRITURA");

  const [proveedores, monedas, proyectos, tcSugerido] = await Promise.all([
    listarProveedores(),
    listarMaestros("MONEDA"),
    listarProyectos(),
    obtenerTipoCambioVigente("COMPRA"),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nueva compra</h1>
      <NuevaCompraForm proveedores={proveedores} monedas={monedas} proyectos={proyectos} tcSugerido={tcSugerido} />
    </div>
  );
}
