// Mismo patron visual que PasosContratacion.tsx (stepper con barra de
// avance, un "Ahora:" con la accion pendiente) aplicado al flujo de
// importar un contrato ya firmado en papel -- ver
// 042_rrhh_contrato_importacion.sql. Solo 1 paso de aprobacion (revisar
// y confirmar en la misma pantalla), asi que son 3 etapas visibles: subir
// (la extraccion corre dentro del mismo envio, sin pantalla de espera
// aparte), revisar y confirmar, y contrato activo.
const ETAPAS = [
  {
    titulo: "Subir solicitud escaneada",
    descripcion:
      "Descarga la solicitud en blanco (o usa el contrato ya firmado en el formato de siempre), que se complete y firme, y sube el escaneo (PDF, PNG o JPG).",
    ahora: "Elige el archivo escaneado y pulsa \"Subir y extraer datos\".",
  },
  {
    titulo: "Extraccion automatica",
    descripcion:
      "Al subir el archivo, el sistema lo lee automaticamente (sin pantalla de espera aparte) y completa los campos del contrato con lo que pudo reconocer.",
    ahora: "Esto ocurre solo, como parte del mismo envio -- no hay nada que hacer aca.",
  },
  {
    titulo: "Revisar y confirmar",
    descripcion:
      "Verifica cada campo contra el documento (la extraccion puede equivocarse), corrige lo que haga falta, y confirma.",
    ahora: "Revisa los datos extraidos y pulsa \"Confirmar y activar contrato\".",
  },
  {
    titulo: "Contrato activo",
    descripcion: "Queda igual que un contrato firmado por el flujo normal -- entra a la Planilla Mensual y se le pueden gestionar sus pagos.",
    ahora: "Proceso completo.",
  },
];

export default function PasosImportacionContrato({ paso, finalizado = false }: { paso: 1 | 2 | 3 | 4; finalizado?: boolean }) {
  const completados = finalizado ? ETAPAS.length : paso - 1;
  const porcentaje = Math.round((completados / ETAPAS.length) * 100);
  const etapaActual = ETAPAS[paso - 1];

  return (
    <section aria-label="Etapas de importacion de contrato" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Importar contrato ya firmado</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{finalizado ? "Completo" : `Paso ${paso} de ${ETAPAS.length}`}</span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        aria-label="Avance de la importacion"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${porcentaje}%` }} />
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ETAPAS.map((etapa, i) => {
          const numero = i + 1;
          const hecho = finalizado || numero < paso;
          const actual = !finalizado && numero === paso;
          return (
            <li
              key={etapa.titulo}
              aria-current={actual ? "step" : undefined}
              className={`rounded-lg border p-3 ${
                actual
                  ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                  : hecho
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    actual ? "bg-blue-600 text-white" : hecho ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {hecho ? "✓" : numero}
                </span>
                <span className={`text-sm font-medium ${actual || hecho ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {etapa.titulo}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{etapa.descripcion}</p>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        <span className="font-semibold">{finalizado ? "Estado: " : "Ahora: "}</span>
        {etapaActual.ahora}
      </p>
    </section>
  );
}
