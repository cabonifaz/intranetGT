// Identifica un regimen de contrato (tipo de contrato + tipo de pago de
// locador, si aplica) para saber si ya tiene una plantilla activa
// asignada. Usado tanto en el server component que arma la lista de
// regimenes cubiertos como en el formulario cliente que la consulta.
export function claveRegimen(idTipoContrato: number, idTipoPagoLocador: number | null): string {
  return idTipoPagoLocador ? `${idTipoContrato}:${idTipoPagoLocador}` : `${idTipoContrato}`;
}
