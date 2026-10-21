import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerDeclaracion } from "@/lib/db/repositories/declaracion-tributaria.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { anularDeclaracionAction, eliminarDeclaracionAction, subirDocumentoDeclaracionAction } from "@/lib/actions/declaraciones-tributarias";
import PasosDeclaracion from "@/components/facturacion/PasosDeclaracion";
import DeclaracionTributariaForm from "@/components/facturacion/DeclaracionTributariaForm";
import PresentarDeclaracionButton from "@/components/facturacion/PresentarDeclaracionButton";
import PagarDeclaracionForm from "@/components/facturacion/PagarDeclaracionForm";
import SubmitButton from "@/components/ui/SubmitButton";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

function formatearPeriodo(anio: number, mes: number): string {
  if (mes === 0) return `Año ${anio}`;
  const nombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${nombres[mes - 1]} ${anio}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function DetalleDeclaracionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("IMPUESTOS_EMPRESA", "LECTURA");
  const { id } = await params;
  const idDeclaracion = Number(id);

  const declaracion = await obtenerDeclaracion(idDeclaracion);
  if (!declaracion) notFound();

  const esBorrador = declaracion.ESTADO_DECLARACION_CODIGO === "BORRADOR";
  const esPresentada = declaracion.ESTADO_DECLARACION_CODIGO === "PRESENTADA";
  const esPagada = declaracion.ESTADO_DECLARACION_CODIGO === "PAGADA";
  const esAnulada = declaracion.ESTADO_DECLARACION_CODIGO === "ANULADA";
  const montoAPagar = Number(declaracion.MONTO_TOTAL_A_PAGAR);
  const datosCargados =
    declaracion.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL" ? declaracion.IGV_RESULTANTE !== null : declaracion.SALDO_RENTA !== null;

  const cuentasBancarias = esPresentada && montoAPagar > 0 ? (await listarCuentas(null, true)).filter((c) => c.TIPO_CUENTA_CODIGO === "BANCARIA") : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/facturacion/impuestos" className="text-xs text-slate-500 hover:underline dark:text-slate-400">
          ← Volver a Impuestos
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {declaracion.TIPO_DECLARACION_DESCRIPCION} -- {formatearPeriodo(declaracion.ANIO, declaracion.MES)}
          </h1>
        </div>
        <div className="mt-2">
          <PasosDeclaracion
            datosCargados={datosCargados}
            estadoCodigo={declaracion.ESTADO_DECLARACION_CODIGO}
            montoTotalAPagar={montoAPagar}
            fechaPresentacion={declaracion.FECHA_PRESENTACION}
            fechaPago={declaracion.FECHA_PAGO}
          />
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Vencimiento</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatearFecha(declaracion.FECHA_VENCIMIENTO)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Monto a pagar</dt>
            <dd className="text-slate-800 dark:text-slate-200">
              {montoAPagar < 0 ? "-" : ""}S/ {Math.abs(montoAPagar).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </dd>
          </div>
          {esAnulada ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Motivo de anulacion</dt>
              <dd className="text-slate-800 dark:text-slate-200">{declaracion.MOTIVO_ANULACION ?? "-"}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {esBorrador ? (
        <DeclaracionTributariaForm declaracion={declaracion} />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Montos declarados</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {declaracion.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL" ? (
              <>
                <Dato etiqueta="Ventas gravadas" valor={declaracion.VENTAS_GRAVADAS} />
                <Dato etiqueta="Compras gravadas" valor={declaracion.COMPRAS_GRAVADAS} />
                <Dato etiqueta="IGV ventas" valor={declaracion.IGV_VENTAS} />
                <Dato etiqueta="IGV compras" valor={declaracion.IGV_COMPRAS} />
                <Dato etiqueta="IGV resultante" valor={declaracion.IGV_RESULTANTE} />
                <Dato etiqueta="Pago a cuenta Renta" valor={declaracion.PAGO_A_CUENTA_RENTA} />
              </>
            ) : (
              <>
                <Dato etiqueta="Impuesto calculado" valor={declaracion.IMPUESTO_CALCULADO_RENTA} />
                <Dato etiqueta="Pagos a cuenta acumulados" valor={declaracion.PAGOS_A_CUENTA_ACUMULADOS} />
                <Dato etiqueta="Saldo" valor={declaracion.SALDO_RENTA} />
              </>
            )}
          </dl>
          {declaracion.NOTAS ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{declaracion.NOTAS}</p> : null}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Constancia de SUNAT (respaldo)</h2>
        {declaracion.DOCUMENTO_PATH ? (
          <a
            href={`/api/facturacion/impuestos/${idDeclaracion}/documento`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
          >
            Ver constancia
          </a>
        ) : (
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Todavía no se subió ninguna constancia.</p>
        )}
        {!esAnulada ? (
          <form action={subirDocumentoDeclaracionAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="idDeclaracion" value={idDeclaracion} />
            <input
              type="file"
              name="archivo"
              required
              accept="application/pdf,image/png,image/jpeg"
              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
            />
            <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Subiendo...">
              {declaracion.DOCUMENTO_PATH ? "Reemplazar" : "Subir"}
            </SubmitButton>
          </form>
        ) : null}
      </section>

      {esBorrador ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Presentar a SUNAT</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Si el resultado del periodo genera saldo a favor, se acredita solo a la cuenta IGV a favor / Renta a favor.
          </p>
          <div className="mt-3">
            <PresentarDeclaracionButton idDeclaracion={idDeclaracion} />
          </div>
        </section>
      ) : null}

      {esPresentada && montoAPagar > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Registrar pago</h2>
          <div className="mt-3">
            <PagarDeclaracionForm idDeclaracion={idDeclaracion} cuentasBancarias={cuentasBancarias} />
          </div>
        </section>
      ) : null}

      {(esBorrador || esPresentada) ? (
        <section className="rounded-xl border border-red-100 bg-red-50/40 p-5 dark:border-red-950 dark:bg-red-950/10">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Anular</h2>
          <form action={anularDeclaracionAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="idDeclaracion" value={idDeclaracion} />
            <div className="flex-1">
              <label htmlFor="motivo" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                Motivo
              </label>
              <input
                id="motivo"
                name="motivo"
                required
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <ConfirmSubmitButton
              mensaje="¿Anular esta declaracion? No se podra revertir."
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Anular
            </ConfirmSubmitButton>
          </form>
          {esBorrador ? (
            <form action={eliminarDeclaracionAction} className="mt-3">
              <input type="hidden" name="idDeclaracion" value={idDeclaracion} />
              <ConfirmSubmitButton
                mensaje="¿Eliminar este borrador? No se podra revertir."
                className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                Eliminar borrador
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </section>
      ) : null}

      {esPagada ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900 dark:bg-emerald-950/10">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Pagada el {formatearFecha(declaracion.FECHA_PAGO)} {declaracion.CUENTA_PAGO_NOMBRE ? `desde ${declaracion.CUENTA_PAGO_NOMBRE}` : ""}.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{valor !== null ? Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "-"}</dd>
    </div>
  );
}
