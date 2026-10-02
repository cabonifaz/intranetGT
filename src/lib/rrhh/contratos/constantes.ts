// Texto de relleno cuando la OCR no pudo leer el cargo/servicio -- nunca
// debe llegar a confirmarse tal cual (apareceria literal como "Servicio"
// en la boleta/orden de servicio emitida). Vive en un modulo aparte (no
// en rrhh-contratos-importacion.ts) porque ese archivo es "use server" y
// solo puede exportar funciones.
export const CARGO_PENDIENTE_REVISION = "(completar en revision)";
