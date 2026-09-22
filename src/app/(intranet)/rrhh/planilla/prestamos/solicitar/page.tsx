import Link from "next/link";
import { requireSession } from "@/lib/auth/get-current-user";
import { puedeGestionarPrestamos } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarDirectorio } from "@/lib/db/repositories/rrhh-empleado.repository";
import { listarTodosLosContactosExternos } from "@/lib/db/repositories/directorio-contacto.repository";
import SolicitarPrestamoForm from "@/components/rrhh/SolicitarPrestamoForm";

// Autoservicio: cualquier colaborador con sesion puede solicitar (no
// requiere el permiso RRHH_PLANILLA, que RRHH usa para gestionar/otorgar
// -- pedir uno para uno mismo es otra cosa, ver solicitarPrestamoAction).
// Quien puede gestionar prestamos ademas puede solicitar en nombre de un
// trabajador o un contacto del directorio.
export default async function SolicitarPrestamoPage() {
  const sesion = await requireSession();
  const puedeGestionar = await puedeGestionarPrestamos(sesion.idUsuario);

  const [tipos, monedas, colaboradores, contactos] = await Promise.all([
    listarMaestros("TIPO_PRESTAMO"),
    listarMaestros("MONEDA"),
    puedeGestionar ? listarDirectorio(null, null) : Promise.resolve([]),
    puedeGestionar ? listarTodosLosContactosExternos() : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-lg">
      <Link href={`/rrhh/directorio/${sesion.idUsuario}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Mi ficha
      </Link>
      <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Solicitar préstamo o adelanto</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {puedeGestionar
          ? "Envía una solicitud para ti o en nombre de un trabajador o un contacto del directorio -- RRHH la revisa, define el cronograma de descuento y la hace firmar."
          : "Envía tu solicitud -- RRHH la revisa, define el cronograma de descuento y te la hace firmar."}
      </p>

      <SolicitarPrestamoForm
        tipos={tipos}
        monedas={monedas}
        colaboradores={colaboradores}
        contactos={contactos}
        puedeGestionar={puedeGestionar}
        idUsuarioSesion={sesion.idUsuario}
      />
    </div>
  );
}
