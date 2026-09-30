import { subirSuspension4taAction } from "@/lib/actions/rrhh-planilla";
import SubmitButton from "@/components/ui/SubmitButton";

// Fecha + constancia (PDF/imagen de SUNAT), siempre juntos -- ver
// subirSuspension4taAction. Reusado desde el "lugar" central
// (/rrhh/planilla/suspension-4ta) y desde el detalle de un RxH puntual
// -- "origen" dice a que ruta volver despues de guardar.
export default function Suspension4taForm({
  idUsuario,
  origen,
  compact = false,
}: {
  idUsuario: number;
  origen?: string;
  compact?: boolean;
}) {
  return (
    <form action={subirSuspension4taAction} className={`flex flex-wrap items-end gap-2 ${compact ? "" : "mt-2"}`}>
      <input type="hidden" name="idUsuario" value={idUsuario} />
      {origen ? <input type="hidden" name="origen" value={origen} /> : null}
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Vigente hasta</label>
        <input
          type="date"
          name="suspensionHasta"
          required
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Constancia (SUNAT)</label>
        <input
          name="archivo"
          type="file"
          required
          accept="application/pdf,image/png,image/jpeg"
          className="block text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
        />
      </div>
      <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Subiendo...">
        Guardar suspensión
      </SubmitButton>
    </form>
  );
}
