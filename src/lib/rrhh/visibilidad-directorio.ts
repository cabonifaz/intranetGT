// Debe coincidir con el NIVEL_JERARQUICO sembrado en db/seed/003_areas_roles_negocio.sql
// (Jefatura=10, Asistente=50) y db/seed/001_catalogos_base.sql (SUPER_ADMIN=1).
const NIVEL_JERARQUICO_JEFATURA_O_SUPERIOR = 10;

export interface VisibilidadFicha {
  puedeVerCompleto: boolean;
  puedeEditarCompleto: boolean;
  puedeEditarBasico: boolean;
}

interface CalcularVisibilidadParams {
  esUnoMismo: boolean;
  tieneEscrituraRrhh: boolean;
  viewerNivelJerarquico: number | null;
  viewerIdArea: number | null;
  targetIdArea: number | null;
}

// Reglas (de mas a menos privilegio):
//  1. RRHH con ESCRITURA/ADMIN sobre RRHH_DIRECTORIO: ve y edita todo de cualquiera.
//  2. La propia persona: ve todo de si misma, pero solo edita los campos de
//     contacto (telefono/direccion/foto) -- puesto/DNI/fecha de ingreso los
//     controla RRHH.
//  3. Jefatura (o superior) viendo a alguien de su misma area: ve el detalle
//     completo, de solo lectura.
//  4. Cualquier otro usuario de la intranet: solo ve datos basicos de
//     contacto (nombre, foto, puesto, area, correo).
export function calcularVisibilidadFicha(params: CalcularVisibilidadParams): VisibilidadFicha {
  if (params.tieneEscrituraRrhh) {
    return { puedeVerCompleto: true, puedeEditarCompleto: true, puedeEditarBasico: false };
  }

  if (params.esUnoMismo) {
    return { puedeVerCompleto: true, puedeEditarCompleto: false, puedeEditarBasico: true };
  }

  const esJefaturaDeSuArea =
    params.viewerNivelJerarquico !== null &&
    params.viewerNivelJerarquico <= NIVEL_JERARQUICO_JEFATURA_O_SUPERIOR &&
    params.viewerIdArea !== null &&
    params.viewerIdArea === params.targetIdArea;

  if (esJefaturaDeSuArea) {
    return { puedeVerCompleto: true, puedeEditarCompleto: false, puedeEditarBasico: false };
  }

  return { puedeVerCompleto: false, puedeEditarCompleto: false, puedeEditarBasico: false };
}
