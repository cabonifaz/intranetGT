import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerCliente, listarProyectos } from "@/lib/db/repositories/proyecto.repository";
import { listarContactosPorCliente } from "@/lib/db/repositories/directorio-contacto.repository";
import { actualizarClienteAction, cambiarEstadoClienteAction } from "@/lib/actions/proyectos";
import { crearContactoExternoAction } from "@/lib/actions/directorio-contacto";

export default async function DetalleClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("PROYECTOS_EMPRESA", "LECTURA");
  const { id } = await params;
  const idCliente = Number(id);

  const cliente = await obtenerCliente(idCliente);
  if (!cliente) notFound();

  const [todosLosProyectos, contactos] = await Promise.all([listarProyectos(null, false), listarContactosPorCliente(idCliente)]);
  const proyectosDelCliente = todosLosProyectos.filter((p) => p.ID_CLIENTE === idCliente);
  const activo = cliente.ESTADO_CODIGO === "ACTIVO";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{cliente.RAZON_SOCIAL}</h1>
        <form action={cambiarEstadoClienteAction}>
          <input type="hidden" name="idCliente" value={cliente.ID_CLIENTE} />
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
        <form action={actualizarClienteAction} className="space-y-3">
          <input type="hidden" name="idCliente" value={cliente.ID_CLIENTE} />
          <Campo name="razonSocial" label="Razon social" defaultValue={cliente.RAZON_SOCIAL} />
          <Campo name="ruc" label="RUC" defaultValue={cliente.RUC ?? ""} required={false} />
          <Campo name="nombreContacto" label="Nombre de contacto" defaultValue={cliente.NOMBRE_CONTACTO ?? ""} required={false} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="telefono" label="Telefono" defaultValue={cliente.TELEFONO ?? ""} required={false} />
            <Campo name="correo" label="Correo" type="email" defaultValue={cliente.CORREO ?? ""} required={false} />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Contactos</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tambien aparecen en el Directorio Corporativo (pestaña &quot;Contactos externos&quot;).
        </p>
        <form action={crearContactoExternoAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="tipoRelacionCodigo" value="CLIENTE" />
          <input type="hidden" name="idCliente" value={cliente.ID_CLIENTE} />
          <Campo name="nombres" label="Nombres" />
          <Campo name="apellidos" label="Apellidos" />
          <Campo name="area" label="Area (en el cliente)" required={false} placeholder="Ej. Sistemas" />
          <Campo name="cargo" label="Cargo" required={false} placeholder="Ej. Jefe de Sistemas" />
          <div className="sm:col-span-2">
            <Campo name="temaInteres" label="Tema de interes" required={false} placeholder="Ej. Soporte tecnico, renovaciones" />
          </div>
          <Campo name="relacionGt" label="Relacion con GT" required={false} placeholder="Ej. Punto de contacto tecnico" />
          <Campo name="telefono" label="Telefono" required={false} />
          <Campo name="correo" label="Correo" type="email" required={false} />
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Agregar contacto
            </button>
          </div>
        </form>

        <ul className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {contactos.map((c) => (
            <li key={c.ID_CONTACTO} className="py-2">
              <Link href={`/rrhh/directorio/contactos/${c.ID_CONTACTO}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                {c.NOMBRES} {c.APELLIDOS}
              </Link>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {[c.CARGO, c.AREA].filter(Boolean).join(" - ") || "Sin cargo/area"}
              </p>
            </li>
          ))}
          {contactos.length === 0 ? (
            <li className="py-2 text-slate-400 dark:text-slate-500">Aun no tiene contactos registrados.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Proyectos</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {proyectosDelCliente.map((p) => (
            <li key={p.ID_PROYECTO} className="py-2">
              <Link href={`/facturacion/proyectos/${p.ID_PROYECTO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                {p.NOMBRE}
              </Link>
            </li>
          ))}
          {proyectosDelCliente.length === 0 ? (
            <li className="py-2 text-slate-400 dark:text-slate-500">Aun no tiene proyectos registrados.</li>
          ) : null}
        </ul>
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
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
