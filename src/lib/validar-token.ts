// TOKEN_FIRMA es CHAR(36) (randomUUID()) en las 4 tablas de firma publica
// (RRHH_CONTRATO, RRHH_PRESTAMO, PROYECTO_CONFORMIDAD, RRHH_PLANILLA_DETALLE).
// Un valor de otra longitud nunca puede ser un token real, pero MySQL
// con strict mode rechaza el bind con "Data too long for column 'p_token'"
// en vez de simplemente no encontrar nada -- eso tumbaba la pagina
// publica con un 500 crudo ante cualquier token con forma invalida
// (encontrado por la suite de Playwright). Validar la forma ANTES de
// tocar la base de datos evita la consulta (y el 500) por completo.
const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function tieneFormaDeToken(token: string): boolean {
  return FORMA_UUID.test(token);
}
