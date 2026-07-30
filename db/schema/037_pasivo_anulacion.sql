-- =====================================================================
-- Justificacion obligatoria al anular un pasivo (ver SP_PASIVO_ANULAR) --
-- deja rastro de quien decidio anularlo y por que, para auditoria.
-- =====================================================================

ALTER TABLE PASIVO ADD COLUMN MOTIVO_ANULACION VARCHAR(300) NULL;
ALTER TABLE PASIVO ADD COLUMN FECHA_ANULACION DATETIME NULL;
ALTER TABLE PASIVO ADD COLUMN USUARIO_ANULACION INT UNSIGNED NULL;
