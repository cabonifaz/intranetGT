-- =====================================================================
-- 019_proyecto_facturacion.sql
-- Plan de facturacion de un proyecto/servicio: adelanto, hitos,
-- factura final o facturacion variable, cada uno con monto fijo o un
-- porcentaje del INGRESO_ESPERADO del proyecto (calculado una sola vez
-- al crear el item -- no se recalcula si el ingreso esperado cambia
-- despues, igual criterio que PASIVO_CUOTA.MONTO).
--
-- Estados PLANEADO -> FACTURADO -> COBRADO. Al pasar a COBRADO se
-- enlaza al PROYECTO_INGRESO real que lo cumplio (ID_INGRESO).
-- =====================================================================

CREATE TABLE IF NOT EXISTS PROYECTO_HITO (
    ID_HITO                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_PROYECTO              INT UNSIGNED NOT NULL,
    ID_TIPO_HITO             INT UNSIGNED NOT NULL,
    NOMBRE                   VARCHAR(150) NOT NULL,
    PORCENTAJE               DECIMAL(5,2) NULL,
    MONTO                    DECIMAL(14,2) NOT NULL,
    FECHA_ESTIMADA           DATE         NULL,
    ORDEN                    INT          NOT NULL DEFAULT 0,
    ID_ESTADO_HITO           INT UNSIGNED NOT NULL,
    NRO_FACTURA              VARCHAR(30)  NULL,
    FECHA_FACTURADO          DATE         NULL,
    ID_INGRESO               INT UNSIGNED NULL,
    USUARIO_CREACION         INT UNSIGNED NULL,
    FECHA_CREACION           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_PROYECTO_HITO_PROYECTO FOREIGN KEY (ID_PROYECTO) REFERENCES PROYECTO (ID_PROYECTO),
    CONSTRAINT FK_PROYECTO_HITO_TIPO FOREIGN KEY (ID_TIPO_HITO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PROYECTO_HITO_ESTADO FOREIGN KEY (ID_ESTADO_HITO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PROYECTO_HITO_INGRESO FOREIGN KEY (ID_INGRESO) REFERENCES PROYECTO_INGRESO (ID_INGRESO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PROYECTO_HITO_PROYECTO ON PROYECTO_HITO (ID_PROYECTO, ORDEN);
CREATE INDEX IX_PROYECTO_HITO_ESTADO ON PROYECTO_HITO (ID_ESTADO_HITO);
