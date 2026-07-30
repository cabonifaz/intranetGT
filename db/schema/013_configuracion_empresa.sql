-- =====================================================================
-- 013_configuracion_empresa.sql
-- El logo de la empresa deja de ser algo por-plantilla de contrato y pasa
-- a ser configuracion general de la compañia, administrada solo por
-- SUPER_ADMIN desde /administracion/empresa -- todos los contratos
-- (cualquier plantilla) usan el mismo logo.
-- =====================================================================

CREATE TABLE IF NOT EXISTS CONFIGURACION_EMPRESA (
    ID_CONFIGURACION       INT UNSIGNED PRIMARY KEY,
    LOGO_URL               VARCHAR(300) NULL,
    LOGO_FORMATO           VARCHAR(4)   NULL,
    FECHA_MODIFICACION     DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    USUARIO_MODIFICACION   INT UNSIGNED NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE RRHH_CONTRATO_PLANTILLA
    DROP COLUMN LOGO_URL,
    DROP COLUMN LOGO_FORMATO;
