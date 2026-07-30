// Icono de alerta de vencimiento con 3 niveles de urgencia (rojo =
// proximos dias, ambar = siguiente semana, azul = dentro del mes/ventana
// mas amplia) -- extraido de /rrhh/contratos (primer lugar que lo uso),
// reusado tambien en /facturacion/pagos-recurrentes. El tooltip nativo
// (title) muestra la fecha exacta y los dias restantes al pasar el mouse,
// sin JS adicional.
export const DIAS_PROXIMOS = 7;
export const DIAS_SIGUIENTE_SEMANA = 14;

export function diasHastaVencimiento(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${fecha}T00:00:00`);
  return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function colorAlertaVencimiento(dias: number): string {
  if (dias <= DIAS_PROXIMOS) return "text-red-600 dark:text-red-400";
  if (dias <= DIAS_SIGUIENTE_SEMANA) return "text-amber-600 dark:text-amber-400";
  return "text-blue-600 dark:text-blue-400";
}

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default function IconoAlertaVencimiento({ dias, fecha }: { dias: number; fecha: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 shrink-0 ${colorAlertaVencimiento(dias)}`}
      aria-hidden="true"
    >
      <title>{`Vence el ${formatearFecha(fecha)} (en ${dias} dia${dias === 1 ? "" : "s"})`}</title>
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.18c.75 1.335-.213 2.987-1.743 2.987H3.72c-1.53 0-2.493-1.652-1.743-2.987l6.28-11.18zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
