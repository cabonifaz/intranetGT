"use client";

import { useEffect, useState } from "react";
import type { EmpleadoDirectorioRow, DirectorioContactoConTipoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

interface SelectorBeneficiarioPrestamoProps {
  colaboradores: EmpleadoDirectorioRow[];
  contactos: DirectorioContactoConTipoRow[];
  defaultIdUsuario?: number | null;
  defaultIdContacto?: number | null;
  // Un adelanto de sueldo nunca es para un contacto -- el formulario que
  // usa este selector necesita saber cual de los dos esta activo para
  // deshabilitar esa opcion (ver NuevoPrestamoForm/SolicitarPrestamoForm).
  onFuenteChange?: (fuente: "trabajador" | "contacto") => void;
}

// El beneficiario de un prestamo/adelanto es exactamente uno de dos --
// un trabajador (descuento automatico en su planilla) o un contacto del
// Directorio (sin planilla, su repago se marca a mano) -- mismo criterio
// que el acreedor de PASIVO, ver SelectorAcreedorPasivo.
export default function SelectorBeneficiarioPrestamo({
  colaboradores,
  contactos,
  defaultIdUsuario = null,
  defaultIdContacto = null,
  onFuenteChange,
}: SelectorBeneficiarioPrestamoProps) {
  const [fuente, setFuente] = useState<"trabajador" | "contacto">(defaultIdContacto ? "contacto" : "trabajador");

  useEffect(() => {
    onFuenteChange?.(fuente);
    // Solo al montar/cambiar fuente -- onFuenteChange no deberia disparar esto de nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={fuente === "trabajador"}
            onChange={() => setFuente("trabajador")}
            className="border-slate-300 dark:border-slate-700"
          />
          Trabajador
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={fuente === "contacto"}
            onChange={() => setFuente("contacto")}
            className="border-slate-300 dark:border-slate-700"
          />
          Contacto del directorio
        </label>
      </div>

      {fuente === "trabajador" ? (
        <ComboBusqueda
          name="idUsuario"
          placeholder="-- selecciona un colaborador --"
          defaultValue={defaultIdUsuario ? String(defaultIdUsuario) : ""}
          opciones={colaboradores.map((u) => ({ value: String(u.ID_USUARIO), label: `${u.NOMBRES} ${u.APELLIDOS} (${u.CORREO})` }))}
        />
      ) : (
        <ComboBusqueda
          name="idContacto"
          placeholder="-- selecciona un contacto --"
          defaultValue={defaultIdContacto ? String(defaultIdContacto) : ""}
          opciones={contactos.map((c) => ({
            value: String(c.ID_CONTACTO),
            label: `${c.NOMBRES} ${c.APELLIDOS} — ${c.EMPRESA_NOMBRE} (${c.TIPO_RELACION_DESCRIPCION})`,
          }))}
        />
      )}
    </div>
  );
}
