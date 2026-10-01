-- =====================================================================
-- Cuando un detalle de planilla se queda sin emitir (ej. un mes que ya
-- se cerro para todos los demas, y este colaborador se corrigio tarde),
-- en vez de forzar reabrir ese mes puntual, se puede "aplazar": se borra
-- el detalle de ese mes y su monto bruto queda pendiente de sumarse al
-- periodo del contrato del mes siguiente -- ver SP_RRHH_PLANILLA_DETALLE_
-- APLAZAR / asegurarPeriodoDelMes (TypeScript, que consume y borra estas
-- filas al generar el periodo destino).
-- =====================================================================

CREATE TABLE RRHH_CONTRATO_ARRASTRE_PENDIENTE (
    ID_ARRASTRE       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CONTRATO        INT UNSIGNED NOT NULL,
    ANIO_DESTINO        SMALLINT UNSIGNED NOT NULL,
    MES_DESTINO         TINYINT UNSIGNED NOT NULL,
    MONTO                DECIMAL(12,2) NOT NULL,
    USUARIO_CREACION    INT UNSIGNED NULL,
    FECHA_CREACION       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_ARRASTRE_CONTRATO FOREIGN KEY (ID_CONTRATO) REFERENCES RRHH_CONTRATO (ID_CONTRATO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_ARRASTRE_CONTRATO_PERIODO ON RRHH_CONTRATO_ARRASTRE_PENDIENTE (ID_CONTRATO, ANIO_DESTINO, MES_DESTINO);
