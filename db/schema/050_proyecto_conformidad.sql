-- =====================================================================
-- Conformidad de cliente por hito de facturacion: para los proyectos que
-- facturan "por entregables con conformidad" (REQUIERE_CONFORMIDAD_FACTURACION=1),
-- cada PROYECTO_HITO necesita que el cliente firme su conformidad antes
-- de poder marcarse como facturado (ver guard en
-- SP_PROYECTO_HITO_MARCAR_FACTURADO, db/procedures/sp_proyecto.sql).
-- 1 conformidad = 1 hito (UNIQUE en ID_HITO).
--
-- Mismo mecanismo de firma que RRHH_PRESTAMO (007_rrhh_contratos.sql /
-- 045_rrhh_prestamo_firma_digital.sql): columnas de token en la propia
-- tabla del documento, sin tabla de tokens aparte. El cliente firma por
-- el link publico (dibujando su firma o subiendo una foto) o el gestor
-- sube el documento ya firmado en papel -- la empresa nunca firma
-- digitalmente, solo se imprime su nombre (ver pdf-writer.ts).
--
-- Estados BORRADOR (items editables) -> EMITIDA (PDF generado, items
-- congelados, lista para firmar) -> FIRMADA, + ANULADA (ver
-- 047_catalogos_conformidad.sql).
-- =====================================================================

ALTER TABLE PROYECTO
    ADD COLUMN REQUIERE_CONFORMIDAD_FACTURACION TINYINT(1) NOT NULL DEFAULT 0 AFTER ES_INTERNO;

CREATE TABLE IF NOT EXISTS PROYECTO_CONFORMIDAD (
    ID_CONFORMIDAD           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_HITO                  INT UNSIGNED NOT NULL,
    ID_PROYECTO              INT UNSIGNED NOT NULL,
    TITULO                   VARCHAR(150) NOT NULL,
    ID_ESTADO_CONFORMIDAD    INT UNSIGNED NOT NULL,
    DOCUMENTO_PATH           VARCHAR(300) NULL,
    DOCUMENTO_FIRMADO_PATH   VARCHAR(300) NULL,
    FIRMA_PNG_PATH           VARCHAR(300) NULL,
    FECHA_EMISION            DATETIME NULL,
    FECHA_FIRMA              DATETIME NULL,
    USUARIO_FIRMA_REGISTRO   INT UNSIGNED NULL,
    TOKEN_FIRMA              CHAR(36) NULL,
    TOKEN_EXPIRA             DATETIME NULL,
    MOTIVO_ANULACION         VARCHAR(300) NULL,
    FECHA_ANULACION          DATETIME NULL,
    USUARIO_ANULACION        INT UNSIGNED NULL,
    USUARIO_CREACION         INT UNSIGNED NULL,
    FECHA_CREACION           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION       DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_CONFORMIDAD_HITO FOREIGN KEY (ID_HITO) REFERENCES PROYECTO_HITO (ID_HITO),
    CONSTRAINT FK_CONFORMIDAD_PROYECTO FOREIGN KEY (ID_PROYECTO) REFERENCES PROYECTO (ID_PROYECTO),
    CONSTRAINT FK_CONFORMIDAD_ESTADO FOREIGN KEY (ID_ESTADO_CONFORMIDAD) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT UQ_CONFORMIDAD_HITO UNIQUE (ID_HITO),
    CONSTRAINT UQ_CONFORMIDAD_TOKEN UNIQUE (TOKEN_FIRMA)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CONFORMIDAD_PROYECTO ON PROYECTO_CONFORMIDAD (ID_PROYECTO);

CREATE TABLE IF NOT EXISTS PROYECTO_CONFORMIDAD_ITEM (
    ID_ITEM                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CONFORMIDAD           INT UNSIGNED NOT NULL,
    ORDEN                    INT NOT NULL DEFAULT 0,
    DESCRIPCION              VARCHAR(300) NOT NULL,
    FECHA_CREACION           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_CONFORMIDAD_ITEM_CONFORMIDAD FOREIGN KEY (ID_CONFORMIDAD) REFERENCES PROYECTO_CONFORMIDAD (ID_CONFORMIDAD)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CONFORMIDAD_ITEM_CONFORMIDAD ON PROYECTO_CONFORMIDAD_ITEM (ID_CONFORMIDAD, ORDEN);
