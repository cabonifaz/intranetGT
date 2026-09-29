import { obtenerPrestamoPorToken } from "@/lib/db/repositories/rrhh-prestamo.repository";
import FirmarPrestamoForm from "@/components/rrhh/FirmarPrestamoForm";

function formatearMonto(monto: string | number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(`${fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "long" });
}

function estaVencido(tokenExpira: string | null): boolean {
  if (!tokenExpira) return false;
  return new Date(tokenExpira).getTime() < Date.now();
}

// Publica, sin sesion -- misma logica que /contratos/firmar/[token]:
// token invalido/usado y token vencido muestran mensajes distintos.
// Aca solo firma el beneficiario (trabajador o contacto) -- EL EMPLEADOR
// nunca firma digitalmente, solo se imprime su nombre (ver
// generar-compromiso-prestamo-pdf.ts) -- por eso no hay datos bancarios
// ni segunda firma que pedir, a diferencia de Contratos.
export default async function FirmarPrestamoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const prestamo = await obtenerPrestamoPorToken(token);

  const invalido = !prestamo || prestamo.ESTADO_PRESTAMO_CODIGO !== "PENDIENTE_FIRMA";
  const vencido = estaVencido(prestamo?.TOKEN_EXPIRA ?? null);

  if (invalido || vencido) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Link no disponible</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {vencido
            ? "Este link de firma ha expirado. Pide a Recursos Humanos que te genere uno nuevo."
            : "Este link ya fue usado o no es válido. Si crees que es un error, contacta a Recursos Humanos."}
        </p>
      </div>
    );
  }

  const esAdelanto = prestamo.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO";
  const nombreTipo = esAdelanto ? "adelanto de sueldo" : "préstamo";

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
          Hola, {prestamo.NOMBRES} {prestamo.APELLIDOS}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Revisa los datos de tu {nombreTipo} y fírmalo para que se active.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Monto del {nombreTipo}</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatearMonto(prestamo.MONTO_TOTAL, prestamo.MONEDA_CODIGO)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Fecha de otorgamiento</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatearFecha(prestamo.FECHA_ORIGEN)}</dd>
          </div>
          {prestamo.DESCRIPCION ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Motivo</dt>
              <dd className="text-slate-800 dark:text-slate-200">{prestamo.DESCRIPCION}</dd>
            </div>
          ) : null}
        </dl>
        <a
          href={`/api/prestamos/publico/${token}/vista-previa`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
        >
          Leer el compromiso completo (PDF)
        </a>
      </div>

      <FirmarPrestamoForm token={token} />
    </div>
  );
}
