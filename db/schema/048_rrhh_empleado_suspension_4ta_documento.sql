-- =====================================================================
-- La suspension de retencion de Renta 4ta (SUNAT) ya se modelaba como
-- una sola fecha (SUSPENSION_RETENCION_4TA_HASTA, ver
-- 038_rrhh_planilla_pension_empleado.sql) pero sin la constancia que la
-- respalda ni forma de saber quien/cuando la subio -- solo era un campo
-- mas dentro del formulario grande de "Editar ficha" del Directorio, sin
-- ningun lugar central para renovarla cada año ni ninguna alerta. Se
-- agrega el documento (obligatorio junto con la fecha, ver
-- subirSuspension4taAction) y su trazabilidad.
-- =====================================================================

ALTER TABLE RRHH_EMPLEADO
    ADD COLUMN SUSPENSION_RETENCION_4TA_PATH VARCHAR(300) NULL AFTER SUSPENSION_RETENCION_4TA_HASTA,
    ADD COLUMN FECHA_SUSPENSION_4TA_SUBIDA DATETIME NULL AFTER SUSPENSION_RETENCION_4TA_PATH,
    ADD COLUMN USUARIO_SUSPENSION_4TA_SUBIDA INT UNSIGNED NULL AFTER FECHA_SUSPENSION_4TA_SUBIDA;
