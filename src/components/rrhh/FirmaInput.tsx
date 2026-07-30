"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import SignatureCanvas, { type SignatureCanvasHandle } from "./SignatureCanvas";

export interface FirmaInputHandle {
  obtenerPngDataUrl: () => string | null;
  limpiar: () => void;
}

type Modo = "dibujo" | "imagen";

const ANCHO_MAX_PX = 500;
const TAMANO_MAX_BYTES = 5 * 1024 * 1024;

// pdf-lib (SP_RRHH_CONTRATO_FIRMAR -> generarContratoPdf) solo embebe PNG,
// asi que cualquier imagen subida (jpg, etc.) se redibuja en un canvas
// interno para normalizarla a PNG antes de guardar el data URL.
function convertirArchivoAPngDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, ANCHO_MAX_PX / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("El archivo no es una imagen valida."));
      img.src = lector.result as string;
    };
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}

// Firma: dibujarla en pantalla (touch/mouse) o subir una foto/imagen de la
// firma ya hecha en papel. Expone el mismo handle en ambos modos para que
// el formulario que lo usa no distinga cual se eligio.
const FirmaInput = forwardRef<FirmaInputHandle>(function FirmaInput(_props, ref) {
  const [modo, setModo] = useState<Modo>("dibujo");
  const canvasRef = useRef<SignatureCanvasHandle>(null);
  const [imagenDataUrl, setImagenDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useImperativeHandle(ref, () => ({
    obtenerPngDataUrl: () => (modo === "dibujo" ? (canvasRef.current?.obtenerPngDataUrl() ?? null) : imagenDataUrl),
    limpiar: () => {
      canvasRef.current?.limpiar();
      setImagenDataUrl(null);
    },
  }));

  function cambiarModo(nuevo: Modo): void {
    if (nuevo === modo) return;
    setModo(nuevo);
    setError(null);
    canvasRef.current?.limpiar();
    setImagenDataUrl(null);
  }

  async function alElegirArchivo(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setError("Elige un archivo de imagen (PNG o JPG).");
      return;
    }
    if (archivo.size > TAMANO_MAX_BYTES) {
      setError("La imagen no debe superar 5 MB.");
      return;
    }

    setError(null);
    setCargando(true);
    try {
      setImagenDataUrl(await convertirArchivoAPngDataUrl(archivo));
    } catch {
      setError("No se pudo procesar la imagen. Intenta con otro archivo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <BotonModo activo={modo === "dibujo"} onClick={() => cambiarModo("dibujo")}>
          Dibujar firma
        </BotonModo>
        <BotonModo activo={modo === "imagen"} onClick={() => cambiarModo("imagen")}>
          Subir imagen
        </BotonModo>
      </div>

      {modo === "dibujo" ? (
        <>
          <SignatureCanvas ref={canvasRef} />
          <button
            type="button"
            onClick={() => canvasRef.current?.limpiar()}
            className="mt-1 text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
          >
            Limpiar firma
          </button>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
          {imagenDataUrl ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, no aplica optimizacion de next/image */}
              <img src={imagenDataUrl} alt="Firma cargada" className="mx-auto max-h-32 rounded bg-white" />
              <button
                type="button"
                onClick={() => setImagenDataUrl(null)}
                className="mt-2 text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
              >
                Quitar imagen
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer text-sm text-slate-500 dark:text-slate-400">
              {cargando ? "Procesando..." : "Toca para elegir una foto o imagen de tu firma"}
              <input type="file" accept="image/*" onChange={alElegirArchivo} disabled={cargando} className="hidden" />
            </label>
          )}
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
});

export default FirmaInput;

function BotonModo({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        activo
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
