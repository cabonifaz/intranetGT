// Nota de ayuda corta (icono "i" + texto) para explicar un campo o una
// seccion sin recargar la pantalla -- sin estado ni hooks, se puede usar
// tanto desde Server como Client Components.
export default function NotaAyuda({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`mt-1 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <span
        aria-hidden
        className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
      >
        i
      </span>
      <span>{children}</span>
    </p>
  );
}
