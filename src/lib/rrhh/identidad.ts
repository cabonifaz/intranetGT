interface DatosIdentidad {
  ID_TIPO_DOCUMENTO: number | null;
  NRO_DOCUMENTO: string | null;
}

// Requisito para poder generar un contrato: RRHH ya debe haber completado
// el documento de identidad de la persona (tipo + numero) en el
// Directorio Corporativo -- si no, el PDF saldria con "identificado con
// DNI N° -". Direccion/pais/ciudad NO son obligatorios: no son parte del
// cuerpo de los modelos de contrato (se muestran como "-" si faltan).
export function tieneIdentidadCompleta(empleado: DatosIdentidad | null): boolean {
  if (!empleado) return false;
  return Boolean(empleado.ID_TIPO_DOCUMENTO && empleado.NRO_DOCUMENTO);
}

interface DatosIdentidadContrato {
  NRO_DOCUMENTO: string | null;
  TIPO_DOCUMENTO_DESCRIPCION: string | null;
}

// Version para las filas de RRHH_CONTRATO (SP_RRHH_CONTRATO_OBTENER /
// _POR_TOKEN), que ya traen los datos del empleado resueltos como
// descripcion en vez de ID crudo -- equivalente a tieneIdentidadCompleta.
export function tieneIdentidadCompletaContrato(contrato: DatosIdentidadContrato | null): boolean {
  if (!contrato) return false;
  return Boolean(contrato.TIPO_DOCUMENTO_DESCRIPCION && contrato.NRO_DOCUMENTO);
}
