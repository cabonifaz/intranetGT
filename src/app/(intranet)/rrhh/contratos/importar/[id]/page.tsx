import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireImportarContrato } from "@/lib/auth/require-permiso";
import { obtenerImportacionContrato } from "@/lib/db/repositories/contrato-importacion.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import PasosImportacionContrato from "@/components/rrhh/PasosImportacionContrato";
import RevisarImportacionContratoForm from "@/components/rrhh/RevisarImportacionContratoForm";

export default async function RevisarImportacionContratoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireImportarContrato();
  const { id } = await params;
  const idContrato = Number(id);

  const importacion = await obtenerImportacionContrato(idContrato);
  if (!importacion) notFound();

  // Ya se confirmo (ej. se volvio a abrir este link despues) -- el
  // detalle normal del contrato es la pantalla correcta desde aca en
  // adelante, no esta.
  if (importacion.ESTADO_CONTRATO_CODIGO !== "IMPORTADO_EN_REVISION") {
    redirect(`/rrhh/contratos/${idContrato}`);
  }

  const [colaboradores, tiposContrato, tiposPagoLocador, monedas] = await Promise.all([
    listarDirectorio(null, null),
    listarMaestros("TIPO_CONTRATO"),
    listarMaestros("TIPO_PAGO_LOCADOR"),
    listarMaestros("MONEDA"),
  ]);

  const advertencias = importacion.ADVERTENCIAS_EXTRACCION ? importacion.ADVERTENCIAS_EXTRACCION.split(" | ") : [];

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link href="/rrhh/contratos" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          &larr; Contratos
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
          Revisar contrato importado -- {importacion.NOMBRES} {importacion.APELLIDOS}
        </h1>
      </div>

      <PasosImportacionContrato paso={3} />

      <a
        href={`/api/rrhh/contratos/${idContrato}/escaneado`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Ver documento escaneado
      </a>

      {advertencias.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="font-medium">La extraccion automatica dejo estas advertencias -- revisa esos campos contra el documento:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <RevisarImportacionContratoForm
        importacion={importacion}
        colaboradores={colaboradores}
        tiposContrato={tiposContrato}
        tiposPagoLocador={tiposPagoLocador}
        monedas={monedas}
      />
    </div>
  );
}
