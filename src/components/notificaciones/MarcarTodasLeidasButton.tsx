"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarcarTodasLeidasButton() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function onClick() {
    setEnviando(true);
    try {
      await fetch("/api/notificaciones/marcar-todas", { method: "POST" });
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={enviando}
      className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60 dark:text-blue-400"
    >
      {enviando ? "Marcando..." : "Marcar todas como leidas"}
    </button>
  );
}
