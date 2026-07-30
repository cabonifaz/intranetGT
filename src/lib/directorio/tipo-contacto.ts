import type { TipoRelacionContactoCodigo } from "@/types/db";

// Colores por tipo de relacion, para diferenciar de un vistazo en el
// Directorio -- siempre acompañados de una etiqueta de texto (nunca solo
// color), mismo criterio de accesibilidad que BarraProgreso.
export const COLOR_TIPO_CONTACTO: Record<TipoRelacionContactoCodigo, string> = {
  CLIENTE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  PROVEEDOR: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  SOCIO_COMERCIAL: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  OTRO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const BADGE_TIPO_CONTACTO: Record<TipoRelacionContactoCodigo, string> = {
  CLIENTE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  PROVEEDOR: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  SOCIO_COMERCIAL: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  OTRO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const COLOR_PERSONAL_GT = "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
