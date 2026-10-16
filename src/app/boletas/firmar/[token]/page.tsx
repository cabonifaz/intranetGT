import { obtenerDetallePorToken } from "@/lib/db/repositories/rrhh-planilla.repository";
import ConfirmarRecepcionBoletaPublico from "@/components/rrhh/ConfirmarRecepcionBoletaPublico";

function formatearMonto(monto: string | number): string {
  return `S/ ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function estaVencido(tokenExpira: string | null): boolean {
  if (!tokenExpira) return false;
  return new Date(tokenExpira).getTime() < Date.now();
}

// Publica, sin sesion -- mismo mecanismo que /prestamos/firmar/[token] y
// /conformidades/firmar/[token], pero mas simple: no hay nada que firmar,
// solo confirmar que se recibio la boleta (un clic). El token se
// consume/limpia al confirmar (ver SP_RRHH_PLANILLA_DETALLE_CONFIRMAR_RECEPCION).
export default async function ConfirmarRecepcionBoletaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const detalle = await obtenerDetallePorToken(token);

  const invalido = !detalle || detalle.ESTADO_EMISION_CODIGO !== "EMITIDA" || Boolean(detalle.FECHA_CONFIRMACION_COLABORADOR);
  const vencido = estaVencido(detalle?.TOKEN_EXPIRA ?? null);

  if (invalido || vencido) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Link no disponible</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {vencido
            ? "Este link ha expirado. Pide a Recursos Humanos que te genere uno nuevo."
            : "Este link ya fue usado o no es válido. Si crees que es un error, contacta a Recursos Humanos."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
          Hola, {detalle.NOMBRES} {detalle.APELLIDOS}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Confirma que recibiste tu boleta de pago de {detalle.PERIODO}.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Cargo</dt>
            <dd className="text-slate-800 dark:text-slate-200">{detalle.CARGO}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Neto a pagar</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatearMonto(detalle.MONTO_NETO)}</dd>
          </div>
        </dl>

        {detalle.DOCUMENTO_PATH ? (
          <a
            href={`/api/boletas/publico/${token}/documento`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
          >
            Ver mi boleta (PDF)
          </a>
        ) : null}
      </div>

      <ConfirmarRecepcionBoletaPublico token={token} />
    </div>
  );
}
