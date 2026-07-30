-- =====================================================================
-- Seguimiento real de sueldos/honorarios pendientes de pago -- hasta
-- ahora "Pagos a contratos" solo mostraba un monto sugerido recalculado
-- cada vez, sin memoria de que periodos ya se pagaron. Aplica a
-- PLANILLA_FULLTIME/PARTTIME y LOCADOR MENSUAL/POR_JORNADA/POR_PROYECTO
-- -- NO a LOCADOR POR_HORA, que ya tiene su propio mecanismo
-- (RRHH_CONTRATO_HORAS). Mismo patron de ledger que RRHH_CONTRATO_HORAS/
-- PROYECTO_COSTO_MANO_OBRA: insertar/marcar pagado/borrar, sin upsert.
-- =====================================================================

CREATE TABLE RRHH_CONTRATO_PERIODO_PAGO (
    ID_PERIODO_PAGO   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CONTRATO       INT UNSIGNED NOT NULL,
    PERIODO           VARCHAR(100) NOT NULL,
    MONTO             DECIMAL(10,2) NOT NULL,
    FECHA_PAGO        DATE NULL,
    ID_MOVIMIENTO     INT UNSIGNED NULL,
    USUARIO_CREACION  INT UNSIGNED NULL,
    FECHA_CREACION    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_CPP_CONTRATO FOREIGN KEY (ID_CONTRATO) REFERENCES RRHH_CONTRATO (ID_CONTRATO),
    CONSTRAINT FK_CPP_MOVIMIENTO FOREIGN KEY (ID_MOVIMIENTO) REFERENCES CUENTA_MOVIMIENTO (ID_MOVIMIENTO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CPP_CONTRATO ON RRHH_CONTRATO_PERIODO_PAGO (ID_CONTRATO);
