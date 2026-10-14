"use client";

import { subirConformidadFirmadaAction } from "@/lib/actions/proyecto-conformidad";
import SubmitButton from "@/components/ui/SubmitButton";

// Alternativa al link publico: el cliente firmo en papel y se sube el
// documento ya firmado (escaneado o foto) -- mismo patron de archivo que
// subirCompromisoFirmadoAction (Prestamos).
export default function SubirConformidadFirmadaForm({ idConformidad, idProyecto }: { idConformidad: number; idProyecto: number }) {
  return (
    <form action={subirConformidadFirmadaAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="idConformidad" value={idConformidad} />
      <input type="hidden" name="idProyecto" value={idProyecto} />
      <input
        name="archivo"
        type="file"
        required
        accept="application/pdf,image/png,image/jpeg"
        className="block text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
      />
      <SubmitButton className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" pendingText="Subiendo...">
        Subir firmada
      </SubmitButton>
    </form>
  );
}
