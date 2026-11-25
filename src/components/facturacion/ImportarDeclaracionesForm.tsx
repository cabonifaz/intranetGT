"use client";

import { useState } from "react";
import Link from "next/link";
import NotaAyuda from "@/components/ui/NotaAyuda";

type EstadoArchivo = "pendiente" | "procesando" | "listo" | "sin_identificar" | "error";

interface ResultadoArchivo {
  nombre: string;
  estado: EstadoArchivo;
  idDeclaracion?: number;
  descripcion?: string;
  advertencias?: string[];
  error?: string;
}

const TIPOS_ACEPTADOS = "application/pdf,image/png,image/jpeg";
// Limite de archivos analizados en simultaneo -- cada uno dispara su
// propia llamada a la API de Claude, no hace falta (ni conviene, por rate
// limit) mandarlos todos de una.
const CONCURRENCIA_MAXIMA = 3;

export default function ImportarDeclaracionesForm() {
  const [resultados, setResultados] = useState<ResultadoArchivo[]>([]);
  const [procesando, setProcesando] = useState(false);

  function actualizar(indice: number, cambios: Partial<ResultadoArchivo>) {
    setResultados((prev) => prev.map((r, i) => (i === indice ? { ...r, ...cambios } : r)));
  }

  async function procesarArchivo(archivo: File, indice: number) {
    actualizar(indice, { estado: "procesando" });

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const respuesta = await fetch("/api/facturacion/impuestos/importar", { method: "POST", body: formData });
      const json = await respuesta.json();

      if (!respuesta.ok || !json.ok) {
        if (json.motivo === "no_identificado") {
          actualizar(indice, { estado: "sin_identificar", advertencias: json.advertencias ?? [] });
        } else {
          actualizar(indice, { estado: "error", error: json.error ?? "Error desconocido." });
        }
        return;
      }

      actualizar(indice, {
        estado: "listo",
        idDeclaracion: json.idDeclaracion,
        descripcion: json.descripcion,
        advertencias: json.advertencias ?? [],
      });
    } catch {
      actualizar(indice, { estado: "error", error: "No se pudo conectar con el servidor." });
    }
  }

  async function manejarSeleccion(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    const lista = Array.from(archivos);
    setResultados(lista.map((a) => ({ nombre: a.name, estado: "pendiente" as EstadoArchivo })));
    setProcesando(true);

    let siguiente = 0;
    async function trabajador() {
      while (siguiente < lista.length) {
        const indice = siguiente++;
        await procesarArchivo(lista[indice], indice);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA_MAXIMA, lista.length) }, trabajador));
    setProcesando(false);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Constancias de SUNAT (PDF, PNG o JPG)</label>
        <input
          type="file"
          multiple
          accept={TIPOS_ACEPTADOS}
          disabled={procesando}
          onChange={(e) => manejarSeleccion(e.target.files)}
          className="block w-full text-sm text-slate-600 dark:text-slate-300"
        />
        <NotaAyuda>
          Puedes elegir varios archivos a la vez -- cada uno se analiza por separado con IA para identificar a que
          periodo y tipo de declaracion corresponde. Se crea (o se encuentra) la declaracion y se le adjunta el
          archivo; la fecha de vencimiento queda provisional (verificala contra el cronograma real de SUNAT) y los
          montos nunca se sobrescriben si la declaracion ya tenia datos cargados.
        </NotaAyuda>
      </div>

      {resultados.length > 0 ? (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {resultados.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800 dark:text-slate-200">{r.nombre}</p>
                {r.estado === "listo" && r.descripcion ? <p className="text-xs text-slate-500 dark:text-slate-400">{r.descripcion}</p> : null}
                {r.estado === "error" && r.error ? <p className="text-xs text-red-600 dark:text-red-400">{r.error}</p> : null}
                {r.estado === "sin_identificar" ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No se pudo identificar el periodo/tipo con confianza -- crea la declaracion a mano y sube este archivo ahi.
                  </p>
                ) : null}
                {r.advertencias && r.advertencias.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-xs text-amber-600 dark:text-amber-400">
                    {r.advertencias.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                {r.estado === "pendiente" ? <span className="text-xs text-slate-400">En espera...</span> : null}
                {r.estado === "procesando" ? <span className="text-xs text-blue-600 dark:text-blue-400">Analizando...</span> : null}
                {r.estado === "listo" && r.idDeclaracion ? (
                  <Link
                    href={`/facturacion/impuestos/${r.idDeclaracion}`}
                    className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    ✓ Ver declaracion
                  </Link>
                ) : null}
                {r.estado === "error" ? <span className="text-xs font-medium text-red-600 dark:text-red-400">✗ Error</span> : null}
                {r.estado === "sin_identificar" ? (
                  <Link href="/facturacion/impuestos/nueva" className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400">
                    Crear a mano
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
