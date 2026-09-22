import Link from "next/link";
import { requireImportarContrato } from "@/lib/auth/require-permiso";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import PasosImportacionContrato from "@/components/rrhh/PasosImportacionContrato";
import ImportarContratoForm from "@/components/rrhh/ImportarContratoForm";

export default async function ImportarContratoPage() {
  await requireImportarContrato();
  const ocrActivo = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  const [colaboradores, tiposContrato, tiposPagoLocador] = await Promise.all([
    listarDirectorio(null, null),
    listarMaestros("TIPO_CONTRATO"),
    listarMaestros("TIPO_PAGO_LOCADOR"),
  ]);

  return (
    <div className="max-w-2xl">
      <Link href="/rrhh/contratos" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Contratos
      </Link>
      <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Importar contrato ya firmado</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Para un contrato firmado en papel, saltando la generacion y firma digital del flujo normal -- reservado a Gerencia,
        Administrador o Jefatura de RRHH.
      </p>

      <div className="mt-4">
        <PasosImportacionContrato paso={1} />
      </div>

      {!ocrActivo ? (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          La lectura automatica (OCR) todavia no esta activada -- vas a subir el escaneo igual (queda guardado como respaldo) y
          vas a completar todos los datos a mano en el paso de revision.
        </p>
      ) : null}

      <div className="mt-4">
        <a
          href="/api/rrhh/contratos/solicitud"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Descargar solicitud en blanco (PDF)
        </a>
      </div>

      <ImportarContratoForm colaboradores={colaboradores} tiposContrato={tiposContrato} tiposPagoLocador={tiposPagoLocador} ocrActivo={ocrActivo} />
    </div>
  );
}
