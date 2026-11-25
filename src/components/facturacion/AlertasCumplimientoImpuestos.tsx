import Link from "next/link";
import type { AlertaDeclaracion } from "@/lib/facturacion/impuestos/dashboard";

function formatearMonto(monto: number): string {
  return `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Fila({ alerta, vencida }: { alerta: AlertaDeclaracion; vencida: boolean }) {
  const texto =
    alerta.tipo === "sin_presentar"
      ? vencida
        ? `vencida hace ${alerta.diasDesdeVencimiento} dia(s) sin presentar`
        : `vence en ${Math.abs(alerta.diasDesdeVencimiento)} dia(s)`
      : vencida
        ? `vencida hace ${alerta.diasDesdeVencimiento} dia(s) sin pagar (${formatearMonto(alerta.monto!)})`
        : `vence en ${Math.abs(alerta.diasDesdeVencimiento)} dia(s) -- ${formatearMonto(alerta.monto!)} por pagar`;

  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <Link href={`/facturacion/impuestos/${alerta.idDeclaracion}`} className="min-w-0 truncate font-medium text-blue-600 hover:underline dark:text-blue-400">
        {alerta.tipoDescripcion} -- {alerta.periodoTexto}
      </Link>
      <span className={`shrink-0 ${vencida ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>{texto}</span>
    </li>
  );
}

export default function AlertasCumplimientoImpuestos({
  vencidasSinPresentar,
  vencidasSinPagar,
  proximosVencimientos,
}: {
  vencidasSinPresentar: AlertaDeclaracion[];
  vencidasSinPagar: AlertaDeclaracion[];
  proximosVencimientos: AlertaDeclaracion[];
}) {
  const sinNada = vencidasSinPresentar.length === 0 && vencidasSinPagar.length === 0 && proximosVencimientos.length === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cumplimiento y vencimientos</h3>

      {sinNada ? (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">✓ Sin declaraciones vencidas ni vencimientos en los proximos 30 dias.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {vencidasSinPresentar.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                ⚠ {vencidasSinPresentar.length} declaracion(es) vencida(s) sin presentar -- riesgo de multa por extemporaneidad
              </p>
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                {vencidasSinPresentar.map((a) => (
                  <Fila key={`sp-${a.idDeclaracion}`} alerta={a} vencida />
                ))}
              </ul>
            </div>
          ) : null}

          {vencidasSinPagar.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                ⚠ {vencidasSinPagar.length} declaracion(es) presentada(s) con pago vencido -- riesgo de intereses moratorios
              </p>
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                {vencidasSinPagar.map((a) => (
                  <Fila key={`sg-${a.idDeclaracion}`} alerta={a} vencida />
                ))}
              </ul>
            </div>
          ) : null}

          {proximosVencimientos.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Proximos 30 dias</p>
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                {proximosVencimientos.map((a) => (
                  <Fila key={`pv-${a.idDeclaracion}`} alerta={a} vencida={false} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
