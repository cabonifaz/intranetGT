-- =====================================================================
-- Seguimiento del pago real de cada detalle de planilla, mas alla de
-- emitir el documento y de marcar pagados los aportes a SUNAT (eso ya
-- existia, ver AFP_ESSALUD_PAGADO):
--   - LOCADOR: RRHH sube el RxH firmado por el colaborador y la
--     evidencia de la transferencia/pago -- dos archivos, dos fechas.
--   - PLANILLA: el colaborador (desde su propia sesion) confirma que
--     recibio su boleta -- un simple acuse de recibo con fecha, no un
--     documento nuevo que firmar.
-- =====================================================================

ALTER TABLE RRHH_PLANILLA_DETALLE
    ADD COLUMN RXH_FIRMADO_PATH VARCHAR(300) NULL AFTER USUARIO_EMISION,
    ADD COLUMN FECHA_RXH_FIRMADO_SUBIDO DATETIME NULL AFTER RXH_FIRMADO_PATH,
    ADD COLUMN EVIDENCIA_PAGO_PATH VARCHAR(300) NULL AFTER FECHA_RXH_FIRMADO_SUBIDO,
    ADD COLUMN FECHA_EVIDENCIA_PAGO_SUBIDA DATETIME NULL AFTER EVIDENCIA_PAGO_PATH,
    ADD COLUMN FECHA_CONFIRMACION_COLABORADOR DATETIME NULL AFTER FECHA_EVIDENCIA_PAGO_SUBIDA;
