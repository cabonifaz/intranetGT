"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 60_000;

// Mientras la pestaña este abierta, confirma actividad cada minuto para que
// SP_SESION_RENOVAR recalcule la expiracion (fin de turno si esta dentro de
// horario, o +30min de respaldo si no). Si el servidor dice que la sesion
// ya no es valida, manda al usuario de vuelta a /login.
export default function SessionHeartbeat() {
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;

    async function latir() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!cancelado && response.status === 401) {
          router.push("/login");
        }
      } catch {
        // Sin conexion momentanea: se reintenta en el siguiente ciclo.
      }
    }

    const intervalId = window.setInterval(latir, HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelado = true;
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
