-- =====================================================================
-- Firma digital del compromiso de pago (mismo mecanismo que Contratos:
-- link con token, sin sesion, ver 007_rrhh_contratos.sql TOKEN_FIRMA/
-- TOKEN_EXPIRA). El beneficiario (trabajador o contacto) abre el link,
-- revisa el PDF y firma con el dedo/mouse o subiendo una foto de su
-- firma -- solo su firma, la de la empresa sigue siendo solo el nombre
-- impreso (mismo criterio que Contratos, ver pdf-writer.ts). Sigue
-- existiendo la opcion manual de subir el documento ya firmado en papel
-- (subirCompromisoFirmadoAction) para quien prefiera esa via.
-- =====================================================================

ALTER TABLE RRHH_PRESTAMO
    ADD COLUMN TOKEN_FIRMA CHAR(36) NULL AFTER DOCUMENTO_FIRMADO_PATH,
    ADD COLUMN TOKEN_EXPIRA DATETIME NULL AFTER TOKEN_FIRMA,
    ADD COLUMN FIRMA_PNG_PATH VARCHAR(300) NULL AFTER TOKEN_EXPIRA,
    ADD CONSTRAINT UQ_PRESTAMO_TOKEN UNIQUE (TOKEN_FIRMA);
