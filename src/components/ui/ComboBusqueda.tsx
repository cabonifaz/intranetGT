"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface OpcionCombo {
  value: string;
  label: string;
}

interface ComboBusquedaProps {
  name: string;
  opciones: OpcionCombo[];
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onSeleccionar?: (value: string) => void;
}

// Select con busqueda por texto (type-to-filter). Envia el valor elegido
// via un input hidden con `name`, para que funcione dentro de un <form
// action={serverAction}> normal sin JS adicional en el submit.
export function ComboBusqueda({ name, opciones, defaultValue, placeholder, disabled, onSeleccionar }: ComboBusquedaProps) {
  const opcionInicial = opciones.find((o) => o.value === defaultValue) ?? null;
  const [valor, setValor] = useState(opcionInicial?.value ?? "");
  const [texto, setTexto] = useState(opcionInicial?.label ?? "");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alClickFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClickFuera);
    return () => document.removeEventListener("mousedown", alClickFuera);
  }, []);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q || texto === opcionInicial?.label) return opciones;
    return opciones.filter((o) => o.label.toLowerCase().includes(q));
  }, [texto, opciones, opcionInicial?.label]);

  function elegir(opcion: OpcionCombo) {
    setValor(opcion.value);
    setTexto(opcion.label);
    setAbierto(false);
    onSeleccionar?.(opcion.value);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <input type="hidden" name={name} value={valor} />
      <input
        type="text"
        value={texto}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          if (valor) {
            setValor("");
            onSeleccionar?.("");
          }
        }}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
      />
      {abierto && !disabled ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filtradas.length === 0 ? (
            <li className="px-3 py-1.5 text-slate-400">Sin resultados</li>
          ) : (
            filtradas.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => elegir(o)}
                  className="block w-full px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700"
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
