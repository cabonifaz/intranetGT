// Simbolos de avance por colaborador -- distinto de PasosPlanillaMensual
// (que es el avance del MES completo): esto es el checklist de UN
// colaborador, para ver de un vistazo que le falta sin entrar al
// detalle. Los pasos difieren por regimen:
//   - Locador: orden emitida -> RxH firmado subido -> evidencia de pago subida.
//   - Planilla: emitida -> aportes AFP/EsSalud pagados -> colaborador
//     confirmo que recibio su boleta.
// Sin estado ni hooks -- funciona en Server Components.
export interface PasosDetallePlanillaProps {
  esLocador: boolean;
  emitida: boolean;
  aportesPagados: boolean;
  rxhFirmadoSubido: boolean;
  evidenciaPagoSubida: boolean;
  confirmadoPorColaborador: boolean;
  compact?: boolean;
}

interface Paso {
  etiqueta: string;
  hecho: boolean;
}

export default function PasosDetallePlanilla({
  esLocador,
  emitida,
  aportesPagados,
  rxhFirmadoSubido,
  evidenciaPagoSubida,
  confirmadoPorColaborador,
  compact = false,
}: PasosDetallePlanillaProps) {
  const pasos: Paso[] = esLocador
    ? [
        { etiqueta: "Orden emitida", hecho: emitida },
        { etiqueta: "RxH firmado", hecho: rxhFirmadoSubido },
        { etiqueta: "Evidencia de pago", hecho: evidenciaPagoSubida },
      ]
    : [
        { etiqueta: "Emitida", hecho: emitida },
        { etiqueta: "Aportes pagados", hecho: aportesPagados },
        { etiqueta: "Colaborador confirmó", hecho: confirmadoPorColaborador },
      ];

  const completados = pasos.filter((p) => p.hecho).length;
  const todoListo = completados === pasos.length;

  return (
    <div
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`${completados} de ${pasos.length} pasos completos: ${pasos.map((p) => `${p.etiqueta} ${p.hecho ? "listo" : "pendiente"}`).join(", ")}`}
    >
      {pasos.map((paso, i) => (
        <span key={paso.etiqueta} className="flex items-center">
          <span
            title={paso.etiqueta}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
              paso.hecho
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {paso.hecho ? "✓" : i + 1}
          </span>
          {!compact ? (
            <span className={`ml-1 mr-2 text-xs ${paso.hecho ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
              {paso.etiqueta}
            </span>
          ) : i < pasos.length - 1 ? (
            <span className="mx-0.5 h-px w-2 bg-slate-200 dark:bg-slate-700" />
          ) : null}
        </span>
      ))}
      {todoListo && compact ? <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">✓ Completo</span> : null}
    </div>
  );
}
