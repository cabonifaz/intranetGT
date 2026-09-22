-- =====================================================================
-- Importar un contrato ya firmado en papel, saltando la generacion +
-- firma digital: se sube el escaneo de la "Solicitud de registro de
-- contrato" (un formato que el propio sistema genera, ver
-- generar-solicitud-contrato-pdf.ts) ya firmada, se le extraen los
-- datos por OCR (Claude API, ver extraer-solicitud-contrato.ts), y un
-- Gerente/Administrador/Jefatura de RRHH revisa y confirma antes de que
-- el contrato quede activo.
--
-- No hace falta una tabla de "solicitudes" separada: el RRHH_CONTRATO se
-- crea de una (estado nuevo IMPORTADO_EN_REVISION) con lo que la OCR
-- pudo leer, y "confirmar" lo pasa a FIRMADO -- reusa toda la maquinaria
-- existente (planilla, PDF, etc.) sin un flujo paralelo. Esta tabla solo
-- guarda la trazabilidad de la importacion (quien subio que, que se
-- extrajo, quien confirmo) -- 1:1 con el contrato importado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS RRHH_CONTRATO_IMPORTACION (
    ID_IMPORTACION              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CONTRATO                  INT UNSIGNED NOT NULL,
    DOCUMENTO_ESCANEADO_PATH     VARCHAR(300) NOT NULL,
    DATOS_EXTRAIDOS_JSON         TEXT NULL,
    ADVERTENCIAS_EXTRACCION      TEXT NULL,
    USUARIO_CARGA                INT UNSIGNED NOT NULL,
    FECHA_CARGA                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    USUARIO_CONFIRMACION         INT UNSIGNED NULL,
    FECHA_CONFIRMACION           DATETIME NULL,
    CONSTRAINT UQ_CONTRATO_IMPORTACION_CONTRATO UNIQUE (ID_CONTRATO),
    CONSTRAINT FK_CONTRATO_IMPORTACION_CONTRATO FOREIGN KEY (ID_CONTRATO) REFERENCES RRHH_CONTRATO (ID_CONTRATO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
