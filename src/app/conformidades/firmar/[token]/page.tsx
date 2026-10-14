import { obtenerConformidadPorToken, listarItemsConformidad } from "@/lib/db/repositories/proyecto-conformidad.repository";
import FirmarConformidadForm from "@/components/facturacion/FirmarConformidadForm";

function formatearMonto(monto: string | number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function estaVencido(tokenExpira: string | null): boolean {
  if (!tokenExpira) return false;
  return new Date(tokenExpira).getTime() < Date.now();
}

// Publica, sin sesion -- misma logica que /prestamos/firmar/[token]:
// token invalido/usado y token vencido muestran mensajes distintos. Aca
// solo firma EL CLIENTE -- la empresa nunca firma digitalmente, solo se
// imprime el nombre de su representante (ver generar-conformidad-pdf.ts).
export default async function FirmarConformidadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const conformidad = await obtenerConformidadPorToken(token);

  const invalido = !conformidad || conformidad.ESTADO_CONFORMIDAD_CODIGO !== "EMITIDA";
  const vencido = estaVencido(conformidad?.TOKEN_EXPIRA ?? null);

  if (invalido || vencido) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Link no disponible</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {vencido
            ? "Este link de firma ha expirado. Pide a tu contacto en el proyecto que te genere uno nuevo."
            : "Este link ya fue usado o no es válido. Si crees que es un error, contacta a tu asesor del proyecto."}
        </p>
      </div>
    );
  }

  const items = await listarItemsConformidad(conformidad.ID_CONFORMIDAD);

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{conformidad.TITULO}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Revisa los items de este entregable y da tu conformidad firmando abajo.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Proyecto</dt>
            <dd className="text-slate-800 dark:text-slate-200">{conformidad.PROYECTO_NOMBRE}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Hito / entregable</dt>
            <dd className="text-slate-800 dark:text-slate-200">{conformidad.HITO_NOMBRE}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Monto</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatearMonto(conformidad.HITO_MONTO, conformidad.MONEDA_CODIGO)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Items de la conformidad</p>
          <ul className="mt-2 space-y-1">
            {items.map((item, i) => (
              <li key={item.ID_ITEM} className="text-sm text-slate-700 dark:text-slate-200">
                {i + 1}. {item.DESCRIPCION}
              </li>
            ))}
          </ul>
        </div>

        <a
          href={`/api/conformidades/publico/${token}/vista-previa`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
        >
          Ver el documento completo (PDF)
        </a>
      </div>

      <FirmarConformidadForm token={token} />
    </div>
  );
}
