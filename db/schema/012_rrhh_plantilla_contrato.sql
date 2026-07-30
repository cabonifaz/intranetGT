-- =====================================================================
-- 012_rrhh_plantilla_contrato.sql
-- Maestro de contratos ("contratos marco"): el gerente de RRHH carga el
-- contenido de cada tipo de contrato (segun regimen: planilla fulltime,
-- planilla parttime, locador por hora/por proyecto/mensual/por jornada)
-- una sola vez, con placeholders (ej. {{NOMBRE_COMPLETO}}), y ese
-- contenido es la base para generar cada contrato individual. Reemplaza
-- las clausulas fijas que antes vivian hardcodeadas en el codigo
-- (src/lib/rrhh/generar-contrato-pdf.ts).
--
-- Una plantilla = PARRAFO_INTRO (identificacion de las partes) + N
-- clausulas ordenadas (RRHH_CONTRATO_PLANTILLA_CLAUSULA). El bloque de
-- firma (nombre, documento, imagen de firma, representante legal) sigue
-- siendo fijo en codigo -- no es editable via plantilla, para no permitir
-- que se altere la parte de verificacion legal del documento.
-- =====================================================================

CREATE TABLE IF NOT EXISTS RRHH_CONTRATO_PLANTILLA (
    ID_PLANTILLA            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_TIPO_CONTRATO        INT UNSIGNED NOT NULL,
    ID_TIPO_PAGO_LOCADOR    INT UNSIGNED NULL,
    NOMBRE                  VARCHAR(150) NOT NULL,
    TITULO_DOCUMENTO        VARCHAR(200) NOT NULL,
    PARRAFO_INTRO           TEXT         NOT NULL,
    LOGO_URL                VARCHAR(300) NULL,
    LOGO_FORMATO            VARCHAR(4)   NULL,
    ID_ESTADO               INT UNSIGNED NOT NULL,
    FECHA_CREACION          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION      DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    USUARIO_CREACION        INT UNSIGNED NULL,
    USUARIO_MODIFICACION    INT UNSIGNED NULL,
    CONSTRAINT FK_PLANTILLA_TIPO_CONTRATO FOREIGN KEY (ID_TIPO_CONTRATO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PLANTILLA_TIPO_PAGO FOREIGN KEY (ID_TIPO_PAGO_LOCADOR) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PLANTILLA_REGIMEN ON RRHH_CONTRATO_PLANTILLA (ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, ID_ESTADO);

CREATE TABLE IF NOT EXISTS RRHH_CONTRATO_PLANTILLA_CLAUSULA (
    ID_CLAUSULA             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_PLANTILLA            INT UNSIGNED NOT NULL,
    ORDEN                   INT          NOT NULL DEFAULT 0,
    TITULO                  VARCHAR(200) NULL,
    CONTENIDO                TEXT        NOT NULL,
    ID_ESTADO               INT UNSIGNED NOT NULL,
    FECHA_CREACION          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    USUARIO_CREACION        INT UNSIGNED NULL,
    CONSTRAINT FK_CLAUSULA_PLANTILLA FOREIGN KEY (ID_PLANTILLA) REFERENCES RRHH_CONTRATO_PLANTILLA (ID_PLANTILLA)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CLAUSULA_PLANTILLA_ORDEN ON RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN);
