import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarClientes } from "@/lib/db/repositories/proyecto.repository";
import { listarProveedores } from "@/lib/db/repositories/compra.repository";
import { crearContactoExternoAction } from "@/lib/actions/directorio-contacto";
import SelectorTipoContacto from "@/components/rrhh/SelectorTipoContacto";

export default async function NuevoContactoExternoPage() {
  // La pantalla es visible con solo LECTURA sobre el Directorio -- el
  // permiso real para guardar (segun el tipo elegido) se valida dentro
  // de crearContactoExternoAction.
  await requirePermiso("RRHH_DIRECTORIO", "LECTURA");

  const [tiposRelacion, clientes, proveedores] = await Promise.all([
    listarMaestros("TIPO_RELACION_CONTACTO"),
    listarClientes(),
    listarProveedores(),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nuevo contacto</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Contactos de cliente o proveedor tambien se pueden agregar directamente desde su ficha.
      </p>

      <form
        action={crearContactoExternoAction}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <SelectorTipoContacto tiposRelacion={tiposRelacion} clientes={clientes} proveedores={proveedores} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo name="nombres" label="Nombres" />
          <Campo name="apellidos" label="Apellidos" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo name="area" label="Area" required={false} placeholder="Ej. Direccion comercial" />
          <Campo name="cargo" label="Cargo" required={false} />
        </div>
        <Campo name="temaInteres" label="Tema de interes" required={false} />
        <Campo name="relacionGt" label="Relacion con GT" required={false} placeholder="Ej. Socio en el proyecto X" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo name="telefono" label="Telefono" required={false} />
          <Campo name="correo" label="Correo" type="email" required={false} />
        </div>

        <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Crear contacto
        </button>
      </form>
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
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
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
