"use client";

interface RevocarRolButtonProps {
  rolNombre: string;
  esPrincipal: boolean;
}

export default function RevocarRolButton({ rolNombre, esPrincipal }: RevocarRolButtonProps) {
  return (
    <button
      type="submit"
      title="Quitar rol"
      onClick={(event) => {
        if (!window.confirm(`¿Quitar el rol "${rolNombre}" a esta persona?`)) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-red-100 hover:text-red-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
    >
      {rolNombre}
      {esPrincipal ? " ★" : ""}
      <span aria-hidden>×</span>
    </button>
  );
}
