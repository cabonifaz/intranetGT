import { requirePermiso } from "@/lib/auth/require-permiso";
import AdminTabs from "@/components/administracion/AdminTabs";

export default async function AdministracionLayout({ children }: { children: React.ReactNode }) {
  await requirePermiso("ADMINISTRACION", "ADMIN");

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Administracion</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Usuarios, roles, aplicaciones, catalogos y permisos de la intranet.
      </p>

      <div className="mt-4">
        <AdminTabs />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
