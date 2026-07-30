import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarComprasPendientes } from "@/lib/db/repositories/compra.repository";
import { listarPeriodosPagoPendientes } from "@/lib/db/repositories/rrhh-periodo-pago.repository";
import { listarHorasPendientes } from "@/lib/db/repositories/contrato.repository";
import { listarCostoManoObraPendientes } from "@/lib/db/repositories/proyecto.repository";
import { listarCuotasPendientes } from "@/lib/db/repositories/pasivo.repository";
import { listarInstanciasPendientes } from "@/lib/db/repositories/pago-recurrente.repository";

function formatearMonto(monto: string | number, monedaCodigo: string | null = null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

interface FilaPendiente {
  origen: "Compra" | "Sueldo/honorario" | "Horas de locador" | "Mano de obra" | "Cuota de pasivo" | "Pago recurrente";
  descripcion: string;
  monto: number;
  monedaCodigo: string | null;
  fecha: string | null;
  href: string;
}

// Vista consolidada de todo lo que la empresa debe y no ha pagado --
// junta compras, sueldos/honorarios (por periodo), horas de locador,
// mano de obra manual de proyectos, cuotas de pasivos y pagos
// recurrentes. Es de solo lectura + enlaces al origen (mismo criterio
// que "Plan de pagos" de Pasivos): el pago en si se hace desde la
// pantalla dueña del dato (compra, contrato, proyecto, pasivo, pago
// recurrente), no aca.
export default async function CuentasPorPagarPage() {
  await requirePermiso("CUENTAS_POR_PAGAR", "LECTURA");

  const [compras, periodos, horas, manoObra, cuotas, pagosRecurrentes] = await Promise.all([
    listarComprasPendientes(),
    listarPeriodosPagoPendientes(),
    listarHorasPendientes(),
    listarCostoManoObraPendientes(),
    listarCuotasPendientes(),
    listarInstanciasPendientes(),
  ]);

  const filas: FilaPendiente[] = [
    ...compras.map((c): FilaPendiente => ({
      origen: "Compra",
      descripcion: `${c.DESCRIPCION} - ${c.PROVEEDOR_RAZON_SOCIAL}`,
      monto: Number(c.MONTO_PENDIENTE),
      monedaCodigo: c.MONEDA_CODIGO,
      fecha: c.FECHA_VENCIMIENTO,
      href: `/facturacion/compras/${c.ID_COMPRA}`,
    })),
    ...periodos.map((p): FilaPendiente => ({
      origen: "Sueldo/honorario",
      descripcion: `${p.NOMBRES} ${p.APELLIDOS} - ${p.PERIODO}`,
      monto: Number(p.MONTO),
      monedaCodigo: null,
      fecha: p.FECHA_CREACION,
      href: `/rrhh/contratos/${p.ID_CONTRATO}`,
    })),
    ...horas.map((h): FilaPendiente => ({
      origen: "Horas de locador",
      descripcion: `${h.NOMBRES} ${h.APELLIDOS} - ${h.NOMBRE_PROYECTO ?? "-"} - ${h.PERIODO}`,
      monto: Number(h.MONTO_CALCULADO),
      monedaCodigo: null,
      fecha: h.FECHA_CREACION,
      href: `/rrhh/contratos/${h.ID_CONTRATO}`,
    })),
    ...manoObra.map((m): FilaPendiente => ({
      origen: "Mano de obra",
      descripcion: `${m.PERSONA} - ${m.PROYECTO_NOMBRE} - ${m.PERIODO}`,
      monto: Number(m.MONTO),
      monedaCodigo: m.MONEDA_CODIGO,
      fecha: m.FECHA_CREACION,
      href: `/facturacion/proyectos/${m.ID_PROYECTO}`,
    })),
    ...cuotas.map((c): FilaPendiente => ({
      origen: "Cuota de pasivo",
      descripcion: `${c.ACREEDOR} - Cuota ${c.NRO_CUOTA} (${c.TIPO_PASIVO_DESCRIPCION})`,
      monto: Number(c.MONTO),
      monedaCodigo: c.CUENTA_MONEDA_CODIGO,
      fecha: c.FECHA_VENCIMIENTO,
      href: `/facturacion/pasivos/${c.ID_PASIVO}`,
    })),
    ...pagosRecurrentes.map((p): FilaPendiente => ({
      origen: "Pago recurrente",
      descripcion: `${p.PAGO_RECURRENTE_NOMBRE} - ${p.PERIODO}${p.PROYECTO_NOMBRE ? ` - ${p.PROYECTO_NOMBRE}` : ""}`,
      monto: Number(p.MONTO),
      monedaCodigo: p.MONEDA_CODIGO,
      fecha: p.FECHA_VENCIMIENTO,
      href: `/facturacion/pagos-recurrentes/${p.ID_PAGO_RECURRENTE}`,
    })),
  ].sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"));

  const ORIGEN_COLOR: Record<FilaPendiente["origen"], string> = {
    Compra: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    "Sueldo/honorario": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    "Horas de locador": "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
    "Mano de obra": "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    "Cuota de pasivo": "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    "Pago recurrente": "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Cuentas por pagar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Todo lo pendiente de pagar: compras, sueldos/honorarios, mano de obra de proyectos, cuotas de
            pasivos y pagos recurrentes. Cada fila lleva a donde se registra el pago.
          </p>
        </div>
        <Link
          href="/facturacion/pasivos/plan-de-pagos"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Plan de pagos (pasivos)
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Detalle</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filas.map((f, indice) => (
              <tr key={indice}>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${ORIGEN_COLOR[f.origen]}`}>{f.origen}</span>
                </td>
                <td className="px-4 py-3">
                  <Link href={f.href} className="text-blue-600 hover:underline dark:text-blue-400">
                    {f.descripcion}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatearFecha(f.fecha)}</td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatearMonto(f.monto, f.monedaCodigo)}</td>
              </tr>
            ))}
            {filas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  No hay nada pendiente de pagar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
