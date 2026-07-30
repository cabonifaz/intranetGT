import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerPerfilUsuario } from "@/lib/db/repositories/usuario.repository";
import { obtenerHorarioEfectivo } from "@/lib/db/repositories/horario.repository";
import { listarSesionesActivasDelUsuario } from "@/lib/db/repositories/sesion.repository";
import CerrarSesionesButton from "@/components/perfil/CerrarSesionesButton";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

function formatearHora(hora: string | null): string {
  if (!hora) return "--:--";
  return hora.slice(0, 5);
}

export default async function PerfilPage() {
  const sesion = await requireSession();
  const [perfil, horarioHoy, sesionesActivas] = await Promise.all([
    obtenerPerfilUsuario(sesion.idUsuario),
    obtenerHorarioEfectivo(sesion.idUsuario, new Date()),
    listarSesionesActivasDelUsuario(sesion.idUsuario),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Datos de tu cuenta, rol y horario laboral vigente.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Datos personales</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Nombre completo</dt>
            <dd className="text-slate-800 dark:text-slate-200">
              {perfil?.NOMBRES} {perfil?.APELLIDOS}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Usuario</dt>
            <dd className="text-slate-800 dark:text-slate-200">{perfil?.USUARIO}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Correo</dt>
            <dd className="text-slate-800 dark:text-slate-200">{perfil?.CORREO}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Ultimo ingreso</dt>
            <dd className="text-slate-800 dark:text-slate-200">
              {perfil?.ULTIMO_LOGIN ? formatearFecha(perfil.ULTIMO_LOGIN) : "-"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Rol y area</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Area</dt>
            <dd className="text-slate-800 dark:text-slate-200">{perfil?.AREA_NOMBRE ?? "Sin area asignada"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Rol</dt>
            <dd className="text-slate-800 dark:text-slate-200">{perfil?.ROL_NOMBRE ?? "Sin rol asignado"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Horario laboral de hoy</h2>
        {horarioHoy?.HORA_INICIO && horarioHoy?.HORA_FIN ? (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {formatearHora(horarioHoy.HORA_INICIO)} - {formatearHora(horarioHoy.HORA_FIN)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No tienes un horario configurado para hoy; tu sesion usa el respaldo de 30 minutos de inactividad.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Sesiones activas</h2>
          <CerrarSesionesButton />
        </div>
        <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {sesionesActivas.map((s) => (
            <li key={s.ID_SESION} className="flex flex-col gap-0.5 py-2">
              <span className="text-slate-700 dark:text-slate-200">{s.USER_AGENT ?? "Dispositivo desconocido"}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                IP {s.IP_ORIGEN ?? "-"} - ultima actividad {formatearFecha(s.FECHA_ULTIMA_ACTIVIDAD)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
