import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarPlantillas } from "@/lib/db/repositories/plantilla-contrato.repository";
import { listarProyectos } from "@/lib/db/repositories/proyecto.repository";
import { claveRegimen } from "@/lib/rrhh/regimen";
import NuevoContratoForm from "@/components/rrhh/NuevoContratoForm";

export default async function NuevoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>;
}) {
  await requirePermiso("RRHH_CONTRATOS", "ESCRITURA");
  const { usuario } = await searchParams;

  const [empleados, tiposContrato, tiposPagoLocador, tiposDocumento, paises, plantillas, proyectos, monedas] = await Promise.all([
    listarDirectorio(null, null),
    listarMaestros("TIPO_CONTRATO"),
    listarMaestros("TIPO_PAGO_LOCADOR"),
    listarMaestros("TIPO_DOCUMENTO_IDENTIDAD"),
    listarMaestros("PAIS"),
    listarPlantillas(),
    listarProyectos(),
    listarMaestros("MONEDA"),
  ]);

  const regimenesConPlantilla = plantillas
    .filter((p) => p.ESTADO_CODIGO === "ACTIVO")
    .map((p) => claveRegimen(p.ID_TIPO_CONTRATO, p.ID_TIPO_PAGO_LOCADOR));

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nuevo contrato</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Se crea como borrador; despues generas el link para que la persona lo complete y firme.
      </p>

      <NuevoContratoForm
        usuarios={empleados}
        tiposContrato={tiposContrato}
        tiposPagoLocador={tiposPagoLocador}
        tiposDocumento={tiposDocumento}
        paises={paises.map((p) => ({ value: String(p.ID_MAESTRO), label: p.DESCRIPCION }))}
        proyectos={proyectos.map((p) => ({ value: String(p.ID_PROYECTO), label: p.NOMBRE }))}
        monedas={monedas}
        regimenesConPlantilla={regimenesConPlantilla}
        defaultIdUsuario={usuario}
      />
    </div>
  );
}
