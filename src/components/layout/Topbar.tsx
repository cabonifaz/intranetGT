"use client";

import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

interface TopbarProps {
  onOpenMenu: () => void;
  nombres: string;
  apellidos: string;
  rolNombre: string | null;
}

export default function Topbar({ onOpenMenu, nombres, apellidos, rolNombre }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <span className="text-sm font-semibold text-slate-800 lg:hidden dark:text-white">Intranet GT</span>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <ProfileMenu nombres={nombres} apellidos={apellidos} rolNombre={rolNombre} />
      </div>
    </header>
  );
}
