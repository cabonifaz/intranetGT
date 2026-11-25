import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import ImportarDeclaracionesForm from "@/components/facturacion/ImportarDeclaracionesForm";

export default async function ImportarDeclaracionesPage() {
  await requirePermiso("IMPUESTOS_EMPRESA", "ESCRITURA");
  const ocrActivo = Boolean(process.env.OPENAI_API_KEY?.trim());

  return (
    <div>
      <Link href="/facturacion/impuestos" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Impuestos
      </Link>
      <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Importar declaraciones</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Sube varias constancias de SUNAT a la vez -- la IA identifica el periodo y tipo de cada una.
      </p>

      {!ocrActivo ? (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          La lectura automatica (IA) todavia no esta activada en este entorno -- usa &quot;Nueva declaracion&quot; para
          cargar a mano.
        </p>
      ) : null}

      <div className="mt-4">
        <ImportarDeclaracionesForm />
      </div>
    </div>
  );
}
