import Link from "next/link";
import { requireGestionarPrestamos } from "@/lib/auth/require-permiso";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarCuentas } from "@/lib/db/repositories/cuenta.repository";
import { obtenerTipoCambioVigente } from "@/lib/db/repositories/tipo-cambio.repository";
import { obtenerPorcentajeMaximoAdelanto } from "@/lib/rrhh/planilla/adelanto-sueldo";
import NuevoPrestamoForm from "@/components/rrhh/NuevoPrestamoForm";

export default async function NuevoPrestamoPage() {
  await requireGestionarPrestamos();

  const [tipos, colaboradores, contactos, monedas, cuentas, tcPrestamo, porcentajeMaximoAdelanto] = await Promise.all([
    listarMaestros("TIPO_PRESTAMO"),
    listarDirectorio(null, null),
    listarTodosLosContactosExternos(),
    listarMaestros("MONEDA"),
    listarCuentas(),
    obtenerTipoCambioVigente("PRESTAMO"),
    obtenerPorcentajeMaximoAdelanto(),
  ]);

  const hoy = new Date();

  return (
    <div className="max-w-2xl">
      <Link href="/rrhh/planilla/prestamos" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Préstamos
      </Link>
      <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Nuevo préstamo o adelanto de sueldo</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Préstamo o adelanto de sueldo de la empresa a un colaborador (cualquier tipo de contrato), con cronograma de cuotas que se descuentan en su planilla.
      </p>

      <NuevoPrestamoForm
        tipos={tipos}
        colaboradores={colaboradores}
        contactos={contactos}
        monedas={monedas}
        cuentas={cuentas}
        tcSugerido={tcPrestamo}
        porcentajeMaximoAdelanto={porcentajeMaximoAdelanto}
        anioActual={hoy.getFullYear()}
        mesActual={hoy.getMonth() + 1}
        hoy={hoy.toISOString().slice(0, 10)}
      />
    </div>
  );
}
