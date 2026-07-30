"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/administracion/usuarios", label: "Usuarios" },
  { href: "/administracion/roles", label: "Roles y areas" },
  { href: "/administracion/aplicaciones", label: "Aplicaciones" },
  { href: "/administracion/maestros", label: "Maestros" },
  { href: "/administracion/permisos", label: "Permisos" },
  { href: "/administracion/notificaciones", label: "Notificaciones" },
  { href: "/administracion/empresa", label: "Empresa" },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {TABS.map((tab) => {
        const activo = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
              activo
                ? "border-blue-600 text-blue-700 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
