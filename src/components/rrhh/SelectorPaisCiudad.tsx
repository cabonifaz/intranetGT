"use client";

import { useEffect, useState } from "react";
import { ComboBusqueda, type OpcionCombo } from "@/components/ui/ComboBusqueda";

interface SelectorPaisCiudadProps {
  paises: OpcionCombo[];
  idPaisInicial: string;
  idCiudadInicial: string;
  ciudadLabelInicial: string;
}

interface CiudadApi {
  ID_MAESTRO: number;
  DESCRIPCION: string;
}

// Pais: combo con busqueda sobre la lista completa (recibida del server).
// Ciudad: combo en cascada -- se deshabilita sin pais elegido y se recarga
// via /api/maestros/ciudades cada vez que cambia el pais seleccionado.
export function SelectorPaisCiudad({ paises, idPaisInicial, idCiudadInicial, ciudadLabelInicial }: SelectorPaisCiudadProps) {
  const [idPais, setIdPais] = useState(idPaisInicial);
  // Guarda junto a que idPais corresponde la lista cargada, para no mostrar
  // un flash con las ciudades del pais anterior mientras llega el fetch.
  const [ciudadesData, setCiudadesData] = useState<{ idPais: string; opciones: OpcionCombo[] }>({
    idPais: idPaisInicial,
    opciones: idCiudadInicial ? [{ value: idCiudadInicial, label: ciudadLabelInicial }] : [],
  });
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!idPais) return;

    let cancelado = false;

    async function cargarCiudades() {
      setCargando(true);
      try {
        const response = await fetch(`/api/maestros/ciudades?idPais=${idPais}`);
        const data: { ciudades: CiudadApi[] } = await response.json();
        if (cancelado) return;
        setCiudadesData({ idPais, opciones: data.ciudades.map((c) => ({ value: String(c.ID_MAESTRO), label: c.DESCRIPCION })) });
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarCiudades();

    return () => {
      cancelado = true;
    };
  }, [idPais]);

  const ciudades = ciudadesData.idPais === idPais ? ciudadesData.opciones : [];

  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Pais</label>
        <ComboBusqueda
          name="idPais"
          opciones={paises}
          defaultValue={idPaisInicial}
          placeholder="Buscar pais..."
          onSeleccionar={(valor) => setIdPais(valor)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Ciudad</label>
        <ComboBusqueda
          key={idPais}
          name="idCiudad"
          opciones={ciudades}
          defaultValue={idPais === idPaisInicial ? idCiudadInicial : ""}
          placeholder={!idPais ? "Elige un pais primero" : cargando ? "Cargando..." : "Buscar ciudad..."}
          disabled={!idPais}
        />
      </div>
    </>
  );
}
