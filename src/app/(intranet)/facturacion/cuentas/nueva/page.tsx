import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import NuevaCuentaForm from "@/components/facturacion/NuevaCuentaForm";

export default async function NuevaCuentaPage() {
  await requirePermiso("CUENTAS_EMPRESA", "ESCRITURA");

  const [tiposCuenta, bancos, monedas] = await Promise.all([
    listarMaestros("TIPO_CUENTA"),
    listarMaestros("BANCO"),
    listarMaestros("MONEDA"),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Nueva cuenta</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Banco/moneda/número de cuenta solo aplican a cuentas bancarias o de detracciones.
      </p>

      <NuevaCuentaForm tiposCuenta={tiposCuenta} bancos={bancos} monedas={monedas} />
    </div>
  );
}
