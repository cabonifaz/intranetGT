import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarContratos } from "@/lib/db/repositories/contrato.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import type { ContratoListadoRow } from "@/types/db";
import IconoAlertaVencimiento, {
  diasHastaVencimiento,
  DIAS_PROXIMOS,
  DIAS_SIGUIENTE_SEMANA,
} from "@/components/ui/IconoAlertaVencimiento";

const DIAS_ALERTA_VENCIMIENTO = 30;

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requirePermiso("RRHH_CONTRATOS", "LECTURA");
  const { estado: estadoFiltro } = await searchParams;

  const [contratos, porVencer, estadosContrato] = await Promise.all([
    listarContratos(),
    listarContratos(null, DIAS_ALERTA_VENCIMIENTO),
    listarMaestros("ESTADO_CONTRATO"),
  ]);

  const contratosFiltrados = estadoFiltro
    ? contratos.filter((c) => c.ESTADO_CONTRATO_CODIGO === estadoFiltro)
    : contratos;

  // Un solo fetch (ventana de 30 dias) y se reparte en 3 niveles de
  // urgencia segun cuantos dias faltan, para que RRHH priorice sin tener
  // que abrir cada contrato.
  const proximosDias = porVencer.filter((c) => c.FECHA_FIN && diasHastaVencimiento(c.FECHA_FIN) <= DIAS_PROXIMOS);
  const siguienteSemana = porVencer.filter(
    (c) =>
      c.FECHA_FIN &&
      diasHastaVencimiento(c.FECHA_FIN) > DIAS_PROXIMOS &&
      diasHastaVencimiento(c.FECHA_FIN) <= DIAS_SIGUIENTE_SEMANA,
  );
  const dentroDelMes = porVencer.filter(
    (c) =>
      c.FECHA_FIN &&
      diasHastaVencimiento(c.FECHA_FIN) > DIAS_SIGUIENTE_SEMANA &&
      diasHastaVencimiento(c.FECHA_FIN) <= DIAS_ALERTA_VENCIMIENTO,
  );

  // Contratos que todavia no llegaron a FIRMADO -- borrador sin enviar, o
  // link ya generado pero la persona aun no firma. No es lo mismo que "por
  // vencer" (eso es sobre contratos ya vigentes), por eso es una alerta
  // aparte.
  const sinCerrar = contratos.filter(
    (c) => c.ESTADO_CONTRATO_CODIGO === "BORRADOR" || c.ESTADO_CONTRATO_CODIGO === "PENDIENTE_FIRMA",
  );

  // Mismo `porVencer` (30 dias) reusado para el icono de alerta en cada
  // fila de la tabla, en vez de un fetch aparte -- un solo Map de
  // ID_CONTRATO -> dias restantes, con los mismos 3 niveles de urgencia
  // (colores) que ya usan los paneles de arriba.
  const diasPorContrato = new Map(porVencer.filter((c) => c.FECHA_FIN).map((c) => [c.ID_CONTRATO, diasHastaVencimiento(c.FECHA_FIN as string)]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Contratos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Contratacion de planilla y locadores, vencimientos y firma digital.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/rrhh/contratos/plantillas"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Plantillas de contrato
          </Link>
          <Link href="/rrhh/contratos/nuevo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Nuevo contrato
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <AlertaContratos
          titulo="Vencen en los próximos días"
          contratos={proximosDias}
          colores="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          coloresTexto="text-red-800 dark:text-red-300"
          coloresEnlace="text-red-700 hover:underline dark:text-red-400"
          detalle={(c) => `vence ${formatearFecha(c.FECHA_FIN)}`}
        />
        <AlertaContratos
          titulo="Vencen la siguiente semana"
          contratos={siguienteSemana}
          colores="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          coloresTexto="text-amber-800 dark:text-amber-300"
          coloresEnlace="text-amber-700 hover:underline dark:text-amber-400"
          detalle={(c) => `vence ${formatearFecha(c.FECHA_FIN)}`}
        />
        <AlertaContratos
          titulo="Vencen dentro del mes"
          contratos={dentroDelMes}
          colores="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
          coloresTexto="text-blue-800 dark:text-blue-300"
          coloresEnlace="text-blue-700 hover:underline dark:text-blue-400"
          detalle={(c) => `vence ${formatearFecha(c.FECHA_FIN)}`}
        />
        <AlertaContratos
          titulo="Aún no se han cerrado"
          contratos={sinCerrar}
          colores="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30"
          coloresTexto="text-purple-800 dark:text-purple-300"
          coloresEnlace="text-purple-700 hover:underline dark:text-purple-400"
          detalle={(c) => c.ESTADO_CONTRATO_DESCRIPCION}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FiltroEstado label="Todos" activo={!estadoFiltro} href="/rrhh/contratos" />
        {estadosContrato.map((e) => (
          <FiltroEstado
            key={e.ID_MAESTRO}
            label={e.DESCRIPCION}
            activo={estadoFiltro === e.CODIGO}
            href={`/rrhh/contratos?estado=${e.CODIGO}`}
          />
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Persona</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Cargo</th>
              <th className="px-4 py-2">Inicio</th>
              <th className="px-4 py-2">Fin</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {contratosFiltrados.map((c) => (
              <tr key={c.ID_CONTRATO}>
                <td className="px-4 py-2">
                  <Link href={`/rrhh/contratos/${c.ID_CONTRATO}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {c.NOMBRES} {c.APELLIDOS}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.TIPO_CONTRATO_DESCRIPCION}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.CARGO}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{formatearFecha(c.FECHA_INICIO)}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    {formatearFecha(c.FECHA_FIN)}
                    {c.FECHA_FIN && diasPorContrato.has(c.ID_CONTRATO) ? (
                      <IconoAlertaVencimiento dias={diasPorContrato.get(c.ID_CONTRATO) as number} fecha={c.FECHA_FIN} />
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {c.ESTADO_CONTRATO_DESCRIPCION}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {c.ESTADO_CONTRATO_CODIGO === "FIRMADO" ? (
                    <a
                      href={`/api/contratos/${c.ID_CONTRATO}/documento`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      Descargar
                    </a>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">-</span>
                  )}
                </td>
              </tr>
            ))}
            {contratosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {estadoFiltro ? "No hay contratos con este estado." : "Aun no hay contratos registrados."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FiltroEstado({ label, activo, href }: { label: string; activo: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        activo
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}

function AlertaContratos({
  titulo,
  contratos,
  colores,
  coloresTexto,
  coloresEnlace,
  detalle,
}: {
  titulo: string;
  contratos: ContratoListadoRow[];
  colores: string;
  coloresTexto: string;
  coloresEnlace: string;
  detalle: (contrato: ContratoListadoRow) => string;
}) {
  if (contratos.length === 0) return null;

  return (
    <div className={`rounded-xl border p-4 ${colores}`}>
      <p className={`text-sm font-medium ${coloresTexto}`}>
        {contratos.length} contrato(s) {titulo.toLowerCase()}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {contratos.map((c) => (
          <li key={c.ID_CONTRATO}>
            <Link href={`/rrhh/contratos/${c.ID_CONTRATO}`} className={coloresEnlace}>
              {c.NOMBRES} {c.APELLIDOS} - {c.CARGO} ({detalle(c)})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
