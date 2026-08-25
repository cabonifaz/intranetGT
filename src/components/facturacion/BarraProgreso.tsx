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
  // Sin total de referencia (ej. proyecto sin costo presupuestado) no
  // hay nada contra que comparar -- mostrar "de US$ 0.00" leeria como
  // "se supero un presupuesto de cero", asi que en ese caso se corta el
  // mensaje ahi y se deja la barra vacia en vez de simular un 0%/100%.
  const sinReferencia = total <= 0;
  const pct = sinReferencia ? 0 : valor / total;
  const sobrepasado = invertido && !sinReferencia && pct > 1;
  const cercaDelLimite = invertido && !sinReferencia && !sobrepasado && pct > 0.85;

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
          {sinReferencia
            ? `${formatearMonto(valor, monedaCodigo)} (sin presupuesto definido)`
            : `${formatearMonto(valor, monedaCodigo)} de ${formatearMonto(total, monedaCodigo)} (${Math.round(pct * 100)}%)`}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {!sinReferencia ? <div className={`h-full rounded-full ${colorBarra}`} style={{ width: `${Math.min(pct, 1) * 100}%` }} /> : null}
      </div>
    </div>
  );
}
