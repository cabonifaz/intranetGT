"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SessionHeartbeat from "./SessionHeartbeat";
import type { AplicacionVisibleRow } from "@/types/db";

interface IntranetShellProps {
  nombres: string;
  apellidos: string;
  rolNombre: string | null;
  areaNombre: string | null;
  apps: AplicacionVisibleRow[];
  children: React.ReactNode;
}

export default function IntranetShell({
  nombres,
  apellidos,
  rolNombre,
  areaNombre,
  apps,
  children,
}: IntranetShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <SessionHeartbeat />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} areaNombre={areaNombre} apps={apps} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMenu={() => setSidebarOpen(true)}
          nombres={nombres}
          apellidos={apellidos}
          rolNombre={rolNombre}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
