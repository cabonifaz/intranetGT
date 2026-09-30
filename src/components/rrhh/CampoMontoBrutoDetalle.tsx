"use client";

import { useState } from "react";

// El bruto es el unico campo que, al cambiar, deja desactualizados el
// aporte de pension/retencion (esos quedan con el valor viejo hasta que
// se aprieta "Recalcular con tasas vigentes" aparte) -- esta alerta es
// para que no se pase por alto ese segundo paso. Cliente porque necesita
// comparar el valor tipeado contra el original en vivo.
export default function CampoMontoBrutoDetalle({ valorInicial }: { valorInicial: string | number }) {
  const [valor, setValor] = useState(String(valorInicial));
  const cambio = Number(valor) !== Number(valorInicial);

  return (
    <div>
      <label htmlFor="montoBruto" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        Monto bruto
      </label>
      <input
        id="montoBruto"
        name="montoBruto"
        type="number"
        step="0.01"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className={`w-full rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-800 dark:text-white ${
          cambio ? "border-amber-400 dark:border-amber-600" : "border-slate-300 dark:border-slate-700"
        }`}
      />
      {cambio ? (
        <p className="mt-1.5 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          ⚠️ Cambiaste el bruto -- guarda, y despues no olvides &quot;Recalcular con tasas vigentes&quot; para que el aporte de
          pensión y la retención se actualicen también.
        </p>
      ) : null}
    </div>
  );
}
