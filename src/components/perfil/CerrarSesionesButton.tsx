"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CerrarSesionesButton() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function onClick() {
    setEnviando(true);
    try {
      await fetch("/api/perfil/cerrar-sesiones", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={enviando}
      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
    >
      {enviando ? "Cerrando sesiones..." : "Cerrar todas mis sesiones"}
    </button>
  );
}
