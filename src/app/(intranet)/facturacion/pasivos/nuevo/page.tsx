import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { listarProveedores } from "@/lib/db/repositories/compra.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import NuevoPasivoForm from "@/components/facturacion/NuevoPasivoForm";

export default async function NuevoPasivoPage() {
  await requirePermiso("PASIVOS_EMPRESA", "ESCRITURA");

  const [tiposPasivo, monedas, cuentas, proveedores, contactos, personal] = await Promise.all([
    listarMaestros("TIPO_PASIVO"),
    listarMaestros("MONEDA"),
    listarCuentas(),
    listarProveedores(),
    listarTodosLosContactosExternos(null),
    listarDirectorio(null, null),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nuevo pasivo</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Registra la deuda/prestamo. Las cuotas del plan de pagos se agregan despues, desde el detalle.
      </p>

      <NuevoPasivoForm
        tiposPasivo={tiposPasivo}
        monedas={monedas}
        cuentas={cuentas}
        proveedores={proveedores}
        contactos={contactos}
        personal={personal}
      />
    </div>
  );
}
