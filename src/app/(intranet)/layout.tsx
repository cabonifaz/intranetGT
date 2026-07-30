import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerPerfilUsuario } from "@/lib/db/repositories/usuario.repository";
import { listarAplicacionesVisibles } from "@/lib/db/repositories/aplicacion.repository";
import IntranetShell from "@/components/layout/IntranetShell";

export default async function IntranetLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireSession();
  const [perfil, apps] = await Promise.all([
    obtenerPerfilUsuario(sesion.idUsuario),
    listarAplicacionesVisibles(sesion.idUsuario),
  ]);

  return (
    <IntranetShell
      nombres={sesion.nombres}
      apellidos={sesion.apellidos}
      rolNombre={perfil?.ROL_NOMBRE ?? null}
      areaNombre={perfil?.AREA_NOMBRE ?? null}
      apps={apps}
    >
      {children}
    </IntranetShell>
  );
}
