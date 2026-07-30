"use client";

import { useState } from "react";
import type { ProveedorListadoRow, DirectorioContactoConTipoRow, EmpleadoDirectorioRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface SelectorAcreedorPasivoProps {
  proveedores: ProveedorListadoRow[];
  contactos: DirectorioContactoConTipoRow[];
  personal: EmpleadoDirectorioRow[];
  defaultIdProveedor?: number | null;
  defaultIdContacto?: number | null;
  defaultIdUsuario?: number | null;
}

// El acreedor de un pasivo es exactamente una de tres fuentes -- un
// Proveedor, un contacto del Directorio (persona natural externa) o
// personal interno de GT (ej. gerencia u otro rol) -- nunca texto libre.
export default function SelectorAcreedorPasivo({
  proveedores,
  contactos,
  personal,
  defaultIdProveedor = null,
  defaultIdContacto = null,
  defaultIdUsuario = null,
}: SelectorAcreedorPasivoProps) {
  const [fuente, setFuente] = useState<"proveedor" | "contacto" | "personal">(
    defaultIdContacto ? "contacto" : defaultIdUsuario ? "personal" : "proveedor",
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={fuente === "proveedor"}
            onChange={() => setFuente("proveedor")}
            className="border-slate-300 dark:border-slate-700"
          />
          Proveedor
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={fuente === "contacto"}
            onChange={() => setFuente("contacto")}
            className="border-slate-300 dark:border-slate-700"
          />
          Contacto del directorio (persona natural)
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={fuente === "personal"}
            onChange={() => setFuente("personal")}
            className="border-slate-300 dark:border-slate-700"
          />
          Personal interno de GT
        </label>
      </div>

      {fuente === "proveedor" ? (
        <ComboBusqueda
          name="idProveedor"
          placeholder="-- selecciona un proveedor --"
          defaultValue={defaultIdProveedor ? String(defaultIdProveedor) : ""}
          opciones={proveedores.map((p) => ({ value: String(p.ID_PROVEEDOR), label: p.RAZON_SOCIAL }))}
        />
      ) : null}

      {fuente === "contacto" ? (
        <ComboBusqueda
          name="idContacto"
          placeholder="-- selecciona un contacto --"
          defaultValue={defaultIdContacto ? String(defaultIdContacto) : ""}
          opciones={contactos.map((c) => ({
            value: String(c.ID_CONTACTO),
            label: `${c.NOMBRES} ${c.APELLIDOS} — ${c.EMPRESA_NOMBRE} (${c.TIPO_RELACION_DESCRIPCION})`,
          }))}
        />
      ) : null}

      {fuente === "personal" ? (
        <ComboBusqueda
          name="idUsuarioAcreedor"
          placeholder="-- selecciona una persona --"
          defaultValue={defaultIdUsuario ? String(defaultIdUsuario) : ""}
          opciones={personal.map((e) => ({
            value: String(e.ID_USUARIO),
            label: `${e.NOMBRES} ${e.APELLIDOS} — ${e.AREA_NOMBRE ?? "Sin area"}${e.ROL_NOMBRE ? ` (${e.ROL_NOMBRE})` : ""}`,
          }))}
        />
      ) : null}
    </div>
  );
}
