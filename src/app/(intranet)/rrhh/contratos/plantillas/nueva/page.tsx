import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import NuevaPlantillaForm from "@/components/rrhh/NuevaPlantillaForm";

export default async function NuevaPlantillaPage() {
  await requirePermiso("RRHH_CONTRATOS", "ADMIN");

  const [tiposContrato, tiposPagoLocador] = await Promise.all([
    listarMaestros("TIPO_CONTRATO"),
    listarMaestros("TIPO_PAGO_LOCADOR"),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nueva plantilla de contrato</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Despues de crearla, agregas las clausulas y el logo desde su detalle.
      </p>

      <NuevaPlantillaForm tiposContrato={tiposContrato} tiposPagoLocador={tiposPagoLocador} />
    </div>
  );
}
