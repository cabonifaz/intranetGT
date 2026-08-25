// Fallback instantaneo de Next (loading.js) para toda navegacion dentro
// de (intranet) -- el sidebar/topbar (IntranetShell, en layout.tsx) se
// queda interactivo, solo el contenido de la pagina muestra esto
// mientras el nuevo segmento carga. Sin esto, una navegacion lenta se ve
// como si la app se hubiera quedado congelada a medio camino.
export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />
        Cargando...
      </div>
    </div>
  );
}
