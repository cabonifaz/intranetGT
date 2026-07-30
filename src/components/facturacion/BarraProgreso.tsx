interface BarraProgresoProps {
  etiqueta: string;
  valor: number;
  total: number;
  monedaCodigo: string | null;
  // Cuando "mayor es peor" (costo vs presupuesto): pasar invertido=true
  // para que superar el 100% se marque como alerta. Para ingreso vs
  // esperado, mayor es bueno -- nunca se marca en rojo.
  invertido?: boolean;
}

function formatearMonto(monto: number, monedaCodigo: string | null): string {
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BarraProgreso({ etiqueta, valor, total, monedaCodigo, invertido = false }: BarraProgresoProps) {
  const pct = total > 0 ? valor / total : 0;
  const pctTexto = total > 0 ? `${Math.round(pct * 100)}%` : "sin presupuesto";
  const sobrepasado = invertido && pct > 1;
  const cercaDelLimite = invertido && !sobrepasado && pct > 0.85;

  const colorBarra = sobrepasado
    ? "bg-red-600"
    : cercaDelLimite
      ? "bg-amber-500"
      : "bg-blue-600";

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{etiqueta}</span>
        <span className={sobrepasado ? "font-medium text-red-600 dark:text-red-400" : ""}>
          {formatearMonto(valor, monedaCodigo)} de {formatearMonto(total, monedaCodigo)} ({pctTexto})
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${colorBarra}`} style={{ width: `${Math.min(pct, 1) * 100}%` }} />
      </div>
    </div>
  );
}
