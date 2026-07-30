"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from "react";

export interface SignatureCanvasHandle {
  obtenerPngDataUrl: () => string | null;
  limpiar: () => void;
}

const ALTO_CSS = 160;

const SignatureCanvas = forwardRef<SignatureCanvasHandle>(function SignatureCanvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(true);

  // El canvas se redimensiona a su ancho real (responsive) y usa
  // devicePixelRatio para que el trazo salga nitido. Sin esto, el buffer
  // interno quedaba fijo en 500x160 mientras el CSS lo achicaba en
  // pantallas angostas, desalineando el trazo respecto al puntero.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function ajustarTamano() {
      const dpr = window.devicePixelRatio || 1;
      const anchoCss = canvas!.clientWidth;
      canvas!.width = anchoCss * dpr;
      canvas!.height = ALTO_CSS * dpr;
      canvas!.getContext("2d")?.scale(dpr, dpr);
      setVacio(true);
    }

    ajustarTamano();
    window.addEventListener("resize", ajustarTamano);
    return () => window.removeEventListener("resize", ajustarTamano);
  }, []);

  useImperativeHandle(ref, () => ({
    obtenerPngDataUrl: () => (vacio ? null : (canvasRef.current?.toDataURL("image/png") ?? null)),
    limpiar: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setVacio(true);
    },
  }));

  function posicion(e: PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function iniciar(e: PointerEvent<HTMLCanvasElement>): void {
    dibujando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicion(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: PointerEvent<HTMLCanvasElement>): void {
    if (!dibujando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicion(e);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    setVacio(false);
  }

  function terminar(): void {
    dibujando.current = false;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ height: ALTO_CSS }}
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={terminar}
      onPointerLeave={terminar}
      className="w-full touch-none rounded-lg border border-slate-300 bg-white dark:border-slate-700"
    />
  );
});

export default SignatureCanvas;
