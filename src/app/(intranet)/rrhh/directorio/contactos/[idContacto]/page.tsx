import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerContactoExterno } from "@/lib/db/repositories/directorio-contacto.repository";
import { actualizarContactoExternoAction, cambiarEstadoContactoExternoAction } from "@/lib/actions/directorio-contacto";
import { BADGE_TIPO_CONTACTO } from "@/lib/directorio/tipo-contacto";

export default async function DetalleContactoExternoPage({
  params,
}: {
  params: Promise<{ idContacto: string }>;
}) {
  await requirePermiso("RRHH_DIRECTORIO", "LECTURA");
  const { idContacto } = await params;
  const id = Number(idContacto);

  const contacto = await obtenerContactoExterno(id);
  if (!contacto) notFound();

  const activo = contacto.ESTADO_CODIGO === "ACTIVO";
  const linkEmpresa =
    contacto.TIPO_RELACION_CODIGO === "CLIENTE" && contacto.ID_CLIENTE
      ? `/facturacion/proyectos/clientes/${contacto.ID_CLIENTE}`
      : contacto.TIPO_RELACION_CODIGO === "PROVEEDOR" && contacto.ID_PROVEEDOR
        ? `/facturacion/compras/proveedores/${contacto.ID_PROVEEDOR}`
        : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/rrhh/directorio?vista=clientes" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          ← Volver al directorio
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {contacto.NOMBRES} {contacto.APELLIDOS}
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-xs ${BADGE_TIPO_CONTACTO[contacto.TIPO_RELACION_CODIGO]}`}>
              {contacto.TIPO_RELACION_DESCRIPCION}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {linkEmpresa ? (
              <Link href={linkEmpresa} className="text-blue-600 hover:underline dark:text-blue-400">
                {contacto.EMPRESA_NOMBRE}
              </Link>
            ) : (
              contacto.EMPRESA_NOMBRE
            )}
          </p>
        </div>
        <form action={cambiarEstadoContactoExternoAction}>
          <input type="hidden" name="idContacto" value={contacto.ID_CONTACTO} />
          <input type="hidden" name="tipoRelacionCodigo" value={contacto.TIPO_RELACION_CODIGO} />
          {contacto.ID_CLIENTE ? <input type="hidden" name="idCliente" value={contacto.ID_CLIENTE} /> : null}
          {contacto.ID_PROVEEDOR ? <input type="hidden" name="idProveedor" value={contacto.ID_PROVEEDOR} /> : null}
          <input type="hidden" name="activo" value={activo ? "0" : "1"} />
          <button
            type="submit"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activo
                ? "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {activo ? "Desactivar" : "Activar"}
          </button>
        </form>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <form action={actualizarContactoExternoAction} className="space-y-3">
          <input type="hidden" name="idContacto" value={contacto.ID_CONTACTO} />
          <input type="hidden" name="tipoRelacionCodigo" value={contacto.TIPO_RELACION_CODIGO} />
          {contacto.ID_CLIENTE ? <input type="hidden" name="idCliente" value={contacto.ID_CLIENTE} /> : null}
          {contacto.ID_PROVEEDOR ? <input type="hidden" name="idProveedor" value={contacto.ID_PROVEEDOR} /> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="nombres" label="Nombres" defaultValue={contacto.NOMBRES} />
            <Campo name="apellidos" label="Apellidos" defaultValue={contacto.APELLIDOS} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="area" label="Area" defaultValue={contacto.AREA ?? ""} required={false} />
            <Campo name="cargo" label="Cargo" defaultValue={contacto.CARGO ?? ""} required={false} />
          </div>
          <Campo name="temaInteres" label="Tema de interes" defaultValue={contacto.TEMA_INTERES ?? ""} required={false} />
          <Campo name="relacionGt" label="Relacion con GT" defaultValue={contacto.RELACION_GT ?? ""} required={false} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="telefono" label="Telefono" defaultValue={contacto.TELEFONO ?? ""} required={false} />
            <Campo name="correo" label="Correo" type="email" defaultValue={contacto.CORREO ?? ""} required={false} />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  required = true,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
