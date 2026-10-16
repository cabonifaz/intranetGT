"use client";

import { useRef, useState, type FormEvent } from "react";
import FirmaInput, { type FirmaInputHandle } from "./FirmaInput";
import { confirmarRecepcionBoletaAction } from "@/lib/actions/rrhh-planilla";
import SubmitButton from "@/components/ui/SubmitButton";

// El colaborador confirma que recibio su boleta, firmando como
// aceptacion -- el form sigue siendo un Server Action nativo (sin fetch
// manual): justo antes de enviarse, se copia la firma dibujada/subida al
// campo oculto "firmaPngDataUrl" que lee confirmarRecepcionBoletaAction.
export default function ConfirmarRecepcionBoletaForm({ idPlanillaDetalle }: { idPlanillaDetalle: number }) {
  const firmaRef = useRef<FirmaInputHandle>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const firmaPngDataUrl = firmaRef.current?.obtenerPngDataUrl();
    if (!firmaPngDataUrl) {
      event.preventDefault();
      setError("Falta tu firma.");
      return;
    }
    setError(null);
    const campoFirma = event.currentTarget.elements.namedItem("firmaPngDataUrl") as HTMLInputElement;
    campoFirma.value = firmaPngDataUrl;
  }

  return (
    <form action={confirmarRecepcionBoletaAction} onSubmit={onSubmit} className="mt-3 space-y-3">
      <input type="hidden" name="idPlanillaDetalle" value={idPlanillaDetalle} />
      <input type="hidden" name="firmaPngDataUrl" />
      <FirmaInput ref={firmaRef} />
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      <SubmitButton
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        pendingText="Confirmando..."
      >
        Confirmar recepción de mi boleta
      </SubmitButton>
    </form>
  );
}
