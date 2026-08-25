import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  listarCategoriasTipoCambio,
  listarHistoricoTipoCambio,
  obtenerTipoCambioSunatDia,
} from "@/lib/db/repositories/tipo-cambio.repository";
import { fijarTipoCambioAction, actualizarTipoCambioSunatAction } from "@/lib/actions/tipo-cambio";
import SubmitButton from "@/components/ui/SubmitButton";

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

function formatearFechaHora(fecha: string): string {
  return new Date(fecha).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

// TC vigente por categoria de negocio (laboral/prestamos/compras/ventas)
// -- las 4 se fijan automaticamente cada dia con el TC VENTA de SUNAT
// (ver facturacion/layout.tsx -> asegurarTipoCambioDelDia, que ya corrio
// antes de que esta pagina se renderice), pero siguen siendo corregibles
// a mano abajo en cualquier momento -- una correccion manual queda como
// la vigente hasta el proximo sync automatico o la siguiente correccion.
export default async function TipoCambioPage() {
  await requirePermiso("TIPO_CAMBIO", "LECTURA");

  const hoy = new Date().toISOString().slice(0, 10);
  const [sunatDia, categorias] = await Promise.all([obtenerTipoCambioSunatDia(hoy), listarCategoriasTipoCambio()]);
  const historicos = await Promise.all(categorias.map((c) => listarHistoricoTipoCambio(c.ID_CATEGORIA_TC)));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tipo de Cambio</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            TC vigente por categoria -- se fijan solas cada dia con el TC Venta oficial de SUNAT, y se sugieren como
            valor por defecto al registrar un monto en otra moneda. Siempre se pueden corregir a mano abajo o en la
            misma transaccion; fijar un TC nuevo no borra el anterior, queda en el historico.
          </p>
        </div>
        <form action={actualizarTipoCambioSunatAction}>
          <SubmitButton
            title="Vuelve a consultar el TC oficial SUNAT del dia y fija las 4 categorias con el TC Venta obtenido, aunque el sync automatico de hoy ya haya corrido."
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            pendingText="Actualizando..."
          >
            Actualizar TC ahora
          </SubmitButton>
        </form>
      </div>

      {sunatDia ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">TC oficial SUNAT del dia</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Las 4 categorias de abajo ya se fijaron automaticamente con el TC Venta de hoy. Fecha: {formatearFecha(sunatDia.FECHA)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Compra</dt>
              <dd className="font-medium text-slate-800 dark:text-white">{sunatDia.TC_COMPRA}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Venta</dt>
              <dd className="font-medium text-slate-800 dark:text-white">{sunatDia.TC_VENTA}</dd>
            </div>
          </div>
        </section>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No se pudo consultar el TC oficial SUNAT del dia -- las categorias de abajo se quedaron con su ultimo
          valor (fijalas a mano si hace falta corregirlas).
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categorias.map((cat, indice) => (
          <section
            key={cat.ID_CATEGORIA_TC}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{cat.DESCRIPCION}</h2>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{cat.VALOR ?? "Sin fijar"}</p>
            {cat.VIGENTE_DESDE ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">Desde {formatearFechaHora(cat.VIGENTE_DESDE)}</p>
            ) : null}

            <form action={fijarTipoCambioAction} className="mt-3 flex items-end gap-2">
              <input type="hidden" name="idCategoriaTc" value={cat.ID_CATEGORIA_TC} />
              <div className="flex-1">
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Nuevo TC</label>
                <input
                  type="number"
                  step="0.0001"
                  name="valor"
                  required
                  placeholder="Ej. 3.75"
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Fijando...">
                Fijar
              </SubmitButton>
            </form>

            {historicos[indice].length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  Historico ({historicos[indice].length})
                </summary>
                <ul className="mt-2 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {historicos[indice].map((h) => (
                    <li key={h.ID_TIPO_CAMBIO} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-slate-600 dark:text-slate-300">{h.VALOR}</span>
                      <span className="text-right text-slate-400 dark:text-slate-500">
                        {formatearFechaHora(h.FECHA_CREACION)} -{" "}
                        {h.USUARIO_NOMBRES ? `${h.USUARIO_NOMBRES} ${h.USUARIO_APELLIDOS}` : "Automatico (SUNAT)"}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
