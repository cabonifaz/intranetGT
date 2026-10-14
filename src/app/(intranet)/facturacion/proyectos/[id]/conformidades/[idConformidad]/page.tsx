import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { obtenerConformidad, listarItemsConformidad } from "@/lib/db/repositories/proyecto-conformidad.repository";
import { reabrirConformidadAction, eliminarConformidadAction } from "@/lib/actions/proyecto-conformidad";
import PasosConformidad from "@/components/facturacion/PasosConformidad";
import ConformidadItemsEditor from "@/components/facturacion/ConformidadItemsEditor";
import EmitirConformidadBoton from "@/components/facturacion/EmitirConformidadBoton";
import GenerarLinkConformidadButton from "@/components/facturacion/GenerarLinkConformidadButton";
import SubirConformidadFirmadaForm from "@/components/facturacion/SubirConformidadFirmadaForm";
import AnularConformidadBoton from "@/components/facturacion/AnularConformidadBoton";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

function formatearMonto(monto: string | number, codigo: string): string {
  const simbolo = codigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function ConformidadDetallePage({
  params,
}: {
  params: Promise<{ id: string; idConformidad: string }>;
}) {
  const sesion = await requireSession();
  const permisos = await obtenerPermisosUsuario(sesion.idUsuario);
  if (!tienePermiso(permisos, "PROYECTOS_EMPRESA", "LECTURA")) redirect("/");
  const puedeGestionar = tienePermiso(permisos, "PROYECTOS_EMPRESA", "ESCRITURA");

  const { id, idConformidad: idConformidadParam } = await params;
  const idProyecto = Number(id);
  const idConformidad = Number(idConformidadParam);

  const conformidad = await obtenerConformidad(idConformidad);
  if (!conformidad || conformidad.ID_PROYECTO !== idProyecto) notFound();

  const items = await listarItemsConformidad(idConformidad);

  const esBorrador = conformidad.ESTADO_CONFORMIDAD_CODIGO === "BORRADOR";
  const esEmitida = conformidad.ESTADO_CONFORMIDAD_CODIGO === "EMITIDA";
  const esFirmada = conformidad.ESTADO_CONFORMIDAD_CODIGO === "FIRMADA";
  const esAnulada = conformidad.ESTADO_CONFORMIDAD_CODIGO === "ANULADA";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/facturacion/proyectos/${idProyecto}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          &larr; {conformidad.PROYECTO_NOMBRE}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{conformidad.TITULO}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Hito: {conformidad.HITO_NOMBRE} -- {formatearMonto(conformidad.HITO_MONTO, conformidad.MONEDA_CODIGO)}
        </p>
      </div>

      <PasosConformidad
        totalItems={items.length}
        estadoCodigo={conformidad.ESTADO_CONFORMIDAD_CODIGO}
        fechaEmision={conformidad.FECHA_EMISION}
        fechaFirma={conformidad.FECHA_FIRMA}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Cliente" valor={conformidad.CLIENTE_RAZON_SOCIAL ?? "-"} />
          <Dato etiqueta="RUC" valor={conformidad.CLIENTE_RUC ?? "-"} />
          <Dato etiqueta="Estado" valor={conformidad.ESTADO_CONFORMIDAD_DESCRIPCION} />
          {esFirmada ? <Dato etiqueta="Firmada el" valor={formatearFecha(conformidad.FECHA_FIRMA)} /> : null}
        </dl>
        {!esBorrador ? (
          <a
            href={`/api/facturacion/conformidades/${idConformidad}/documento`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {esFirmada ? "Descargar PDF firmado" : "Ver PDF (sin firmar)"}
          </a>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Items de la conformidad</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Sobre qué le da conformidad el cliente a este hito -- quedan congelados en el documento una vez emitida.
        </p>
        <div className="mt-3">
          {esBorrador && puedeGestionar ? (
            <ConformidadItemsEditor idConformidad={idConformidad} idProyecto={idProyecto} items={items} />
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.ID_ITEM} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {item.DESCRIPCION}
                </li>
              ))}
              {items.length === 0 ? <p className="text-sm text-slate-400 dark:text-slate-500">Sin items.</p> : null}
            </ul>
          )}
        </div>
      </section>

      {puedeGestionar && esBorrador ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <EmitirConformidadBoton idConformidad={idConformidad} />
            <form action={eliminarConformidadAction}>
              <input type="hidden" name="idConformidad" value={idConformidad} />
              <input type="hidden" name="idProyecto" value={idProyecto} />
              <ConfirmSubmitButton
                mensaje="¿Eliminar esta conformidad? Se borra junto con sus items -- para esto está, deshacer una creación por error."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Eliminar conformidad
              </ConfirmSubmitButton>
            </form>
          </div>
        </section>
      ) : null}

      {puedeGestionar && esEmitida ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Firma del cliente</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            El cliente puede firmar él mismo por el link, o puedes subir el documento si lo firmó en papel.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GenerarLinkConformidadButton idConformidad={idConformidad} />
            <SubirConformidadFirmadaForm idConformidad={idConformidad} idProyecto={idProyecto} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <form action={reabrirConformidadAction}>
              <input type="hidden" name="idConformidad" value={idConformidad} />
              <input type="hidden" name="idProyecto" value={idProyecto} />
              <ConfirmSubmitButton
                mensaje="¿Reabrir esta conformidad para corregir los items? Se borra el PDF ya generado y cualquier link de firma activo."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reabrir
              </ConfirmSubmitButton>
            </form>
            <AnularConformidadBoton idConformidad={idConformidad} idProyecto={idProyecto} />
          </div>
        </section>
      ) : null}

      {esAnulada ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          Anulada{conformidad.FECHA_ANULACION ? ` el ${formatearFecha(conformidad.FECHA_ANULACION)}` : ""}
          {conformidad.MOTIVO_ANULACION ? `: ${conformidad.MOTIVO_ANULACION}` : ""}.
        </section>
      ) : null}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{valor}</dd>
    </div>
  );
}
