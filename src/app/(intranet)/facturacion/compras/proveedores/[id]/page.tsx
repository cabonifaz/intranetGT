import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerProveedor, listarCompras } from "@/lib/db/repositories/compra.repository";
import { listarContactosPorProveedor } from "@/lib/db/repositories/directorio-contacto.repository";
import { actualizarProveedorAction, cambiarEstadoProveedorAction } from "@/lib/actions/compras";
import { crearContactoExternoAction } from "@/lib/actions/directorio-contacto";
import SubmitButton from "@/components/ui/SubmitButton";

function formatearMonto(monto: string | number, monedaCodigo: string | null): string {
  const valor = Number(monto);
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DetalleProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermiso("COMPRAS_EMPRESA", "LECTURA");
  const { id } = await params;
  const idProveedor = Number(id);

  const proveedor = await obtenerProveedor(idProveedor);
  if (!proveedor) notFound();

  const [compras, contactos] = await Promise.all([listarCompras(null, idProveedor), listarContactosPorProveedor(idProveedor)]);
  const activo = proveedor.ESTADO_CODIGO === "ACTIVO";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{proveedor.RAZON_SOCIAL}</h1>
        <form action={cambiarEstadoProveedorAction}>
          <input type="hidden" name="idProveedor" value={proveedor.ID_PROVEEDOR} />
          <input type="hidden" name="activo" value={activo ? "0" : "1"} />
          <SubmitButton
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activo
                ? "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {activo ? "Desactivar" : "Activar"}
          </SubmitButton>
        </form>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <form action={actualizarProveedorAction} className="space-y-3">
          <input type="hidden" name="idProveedor" value={proveedor.ID_PROVEEDOR} />
          <Campo name="razonSocial" label="Razon social" defaultValue={proveedor.RAZON_SOCIAL} />
          <Campo name="ruc" label="RUC" defaultValue={proveedor.RUC ?? ""} required={false} />
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              name="esPersonaNatural"
              value="1"
              defaultChecked={proveedor.ES_PERSONA_NATURAL === 1}
              className="rounded border-slate-300 dark:border-slate-700"
            />
            Persona natural (freelance/tecnico independiente)
          </label>
          <Campo name="nombreContacto" label="Nombre de contacto" defaultValue={proveedor.NOMBRE_CONTACTO ?? ""} required={false} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo name="telefono" label="Telefono" defaultValue={proveedor.TELEFONO ?? ""} required={false} />
            <Campo name="correo" label="Correo" type="email" defaultValue={proveedor.CORREO ?? ""} required={false} />
          </div>
          <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Guardando...">
            Guardar
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Contactos</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tambien aparecen en el Directorio Corporativo (pestaña &quot;Contactos externos&quot;).
        </p>
        <form action={crearContactoExternoAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="tipoRelacionCodigo" value="PROVEEDOR" />
          <input type="hidden" name="idProveedor" value={proveedor.ID_PROVEEDOR} />
          <Campo name="nombres" label="Nombres" />
          <Campo name="apellidos" label="Apellidos" />
          <Campo name="area" label="Area (en el proveedor)" required={false} placeholder="Ej. Ventas" />
          <Campo name="cargo" label="Cargo" required={false} placeholder="Ej. Ejecutivo de cuenta" />
          <div className="sm:col-span-2">
            <Campo name="temaInteres" label="Tema de interes" required={false} placeholder="Ej. Facturacion, soporte" />
          </div>
          <Campo name="relacionGt" label="Relacion con GT" required={false} placeholder="Ej. Contacto comercial" />
          <Campo name="telefono" label="Telefono" required={false} />
          <Campo name="correo" label="Correo" type="email" required={false} />
          <div className="sm:col-span-2">
            <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Agregando...">
              Agregar contacto
            </SubmitButton>
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
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Compras</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Descripcion</th>
                <th className="px-2 py-2 text-right">Monto</th>
                <th className="px-2 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {compras.map((c) => (
                <tr key={c.ID_COMPRA}>
                  <td className="px-2 py-2">
                    <Link href={`/facturacion/compras/${c.ID_COMPRA}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {c.DESCRIPCION}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{formatearMonto(c.MONTO_TOTAL, c.MONEDA_CODIGO)}</td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.ESTADO_COMPRA_DESCRIPCION}</td>
                </tr>
              ))}
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no tiene compras registradas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
