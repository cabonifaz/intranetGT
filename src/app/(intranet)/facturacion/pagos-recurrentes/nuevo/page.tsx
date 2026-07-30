import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { listarProyectos } from "@/lib/db/repositories/proyecto.repository";
import NuevoPagoRecurrenteForm from "@/components/facturacion/NuevoPagoRecurrenteForm";

export default async function NuevoPagoRecurrentePage() {
  await requirePermiso("PAGOS_RECURRENTES", "ESCRITURA");

  const [monedas, cuentas, proyectos] = await Promise.all([
    listarMaestros("MONEDA"),
    listarCuentas(),
    listarProyectos(),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nuevo pago recurrente</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Un gasto que se repite periodo tras periodo (alquiler, internet, software, seguros...). Despues de crearlo,
        genera las instancias pendientes desde su detalle.
      </p>
      <NuevoPagoRecurrenteForm
        monedas={monedas}
        cuentas={cuentas}
        proyectos={proyectos.map((p) => ({ value: String(p.ID_PROYECTO), label: p.NOMBRE }))}
      />
    </div>
  );
}
