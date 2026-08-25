import { esSuperAdmin } from "@/lib/auth/require-permiso";
import { requireSession } from "@/lib/auth/get-current-user";
import { obtenerConfiguracionEmpresa } from "@/lib/db/repositories/configuracion-empresa.repository";
import { actualizarLogoEmpresaAction } from "@/lib/actions/administracion";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function EmpresaPage() {
  // El layout de /administracion ya exige ADMIN sobre ADMINISTRACION; esta
  // pantalla ademas restringe a SUPER_ADMIN especificamente (branding de
  // la compañia, no delegable a un admin de un modulo puntual).
  const sesion = await requireSession();
  const [puedeEditar, config] = await Promise.all([esSuperAdmin(sesion.idUsuario), obtenerConfiguracionEmpresa()]);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Empresa</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Configuracion general de la compañia. El logo se usa en todos los PDFs de contrato, sin importar la
        plantilla.
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Logo</h2>
        {config?.LOGO_URL ? (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Ya hay un logo cargado.</p>
        ) : (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sin logo: los contratos se generan sin encabezado grafico hasta que se suba uno.
          </p>
        )}

        {puedeEditar ? (
          <form action={actualizarLogoEmpresaAction} encType="multipart/form-data" className="mt-3 flex items-center gap-3">
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg"
              required
              className="text-sm text-slate-600 dark:text-slate-300"
            />
            <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Subiendo...">
              Subir
            </SubmitButton>
          </form>
        ) : (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Solo un Super Admin puede subir o cambiar el logo.
          </p>
        )}
      </section>
    </div>
  );
}
