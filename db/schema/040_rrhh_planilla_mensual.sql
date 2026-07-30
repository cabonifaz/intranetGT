-- =====================================================================
-- Planilla mensual: una corrida por mes calendario que junta TODOS los
-- contratos activos (PLANILLA y LOCADOR, cualquier regimen), calcula sus
-- descuentos/retenciones legales, y termina en boleta de pago (5ta) o
-- recibo por honorarios (RxH, 4ta) por colaborador. No reemplaza el pago
-- en si (RRHH_CONTRATO_PERIODO_PAGO/RRHH_CONTRATO_HORAS + CUENTA_MOVIMIENTO
-- siguen siendo quien mueve la plata) -- esto calcula cuanto le
-- corresponde a cada quien, controla si ya se remitieron sus aportes
-- (AFP/EsSalud) a SUNAT, y emite el documento.
-- =====================================================================

CREATE TABLE RRHH_PLANILLA_MENSUAL (
    ID_PLANILLA_MENSUAL   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ANIO                   SMALLINT UNSIGNED NOT NULL,
    MES                    TINYINT UNSIGNED NOT NULL,
    PERIODO                VARCHAR(100) NOT NULL,
    ID_ESTADO_PLANILLA     INT UNSIGNED NOT NULL,
    FECHA_EMISION          DATETIME NULL,
    USUARIO_EMISION        INT UNSIGNED NULL,
    USUARIO_CREACION       INT UNSIGNED NULL,
    FECHA_CREACION         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT UQ_PM_ANIO_MES UNIQUE (ANIO, MES),
    CONSTRAINT FK_PM_ESTADO FOREIGN KEY (ID_ESTADO_PLANILLA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Una fila por contrato por mes. TIPO_REFERENCIA/ID_REFERENCIA (mismo
-- patron generico que PASIVO/CUENTA_MOVIMIENTO) apunta al
-- RRHH_CONTRATO_PERIODO_PAGO que trae el bruto para PLANILLA y LOCADOR
-- MENSUAL/POR_JORNADA/POR_PROYECTO; para LOCADOR POR_HORA queda NULL y
-- el bruto se arma sumando RRHH_PLANILLA_DETALLE_HORAS. Los campos
-- *_APLICADO son una foto de que sistema de pension/fondo/version de
-- tasas se uso para este calculo -- no cambian aunque despues se edite
-- la configuracion de pension del colaborador o se publique una tasa
-- nueva, para que un detalle ya calculado sea reproducible.
CREATE TABLE RRHH_PLANILLA_DETALLE (
    ID_PLANILLA_DETALLE          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_PLANILLA_MENSUAL           INT UNSIGNED NOT NULL,
    ID_CONTRATO                    INT UNSIGNED NOT NULL,
    TIPO_REFERENCIA                 VARCHAR(50) NULL,
    ID_REFERENCIA                   INT UNSIGNED NULL,
    MONTO_BRUTO                      DECIMAL(12,2) NOT NULL,
    MONTO_APORTE_PENSION             DECIMAL(12,2) NULL,
    MONTO_RETENCION_RENTA            DECIMAL(12,2) NULL,
    MONTO_ESSALUD                    DECIMAL(12,2) NULL,
    MONTO_NETO                       DECIMAL(12,2) NOT NULL,
    ID_SISTEMA_PENSION_APLICADO      INT UNSIGNED NULL,
    ID_AFP_FONDO_APLICADO            INT UNSIGNED NULL,
    ID_PARAMETRO_APLICADO            INT UNSIGNED NULL,
    CALCULO_AUTOMATICO               TINYINT NOT NULL DEFAULT 1,
    AFP_ESSALUD_PAGADO               TINYINT NOT NULL DEFAULT 0,
    FECHA_MARCADO_PAGADO             DATETIME NULL,
    USUARIO_MARCADO_PAGADO           INT UNSIGNED NULL,
    ID_ESTADO_EMISION                INT UNSIGNED NOT NULL,
    DOCUMENTO_PATH                   VARCHAR(300) NULL,
    FECHA_EMISION                    DATETIME NULL,
    USUARIO_EMISION                  INT UNSIGNED NULL,
    USUARIO_CREACION                 INT UNSIGNED NULL,
    FECHA_CREACION                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION               DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT UQ_PD_PLANILLA_CONTRATO UNIQUE (ID_PLANILLA_MENSUAL, ID_CONTRATO),
    CONSTRAINT FK_PD_PLANILLA FOREIGN KEY (ID_PLANILLA_MENSUAL) REFERENCES RRHH_PLANILLA_MENSUAL (ID_PLANILLA_MENSUAL),
    CONSTRAINT FK_PD_CONTRATO FOREIGN KEY (ID_CONTRATO) REFERENCES RRHH_CONTRATO (ID_CONTRATO),
    CONSTRAINT FK_PD_SISTEMA_PENSION FOREIGN KEY (ID_SISTEMA_PENSION_APLICADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PD_AFP_FONDO FOREIGN KEY (ID_AFP_FONDO_APLICADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PD_PARAMETRO FOREIGN KEY (ID_PARAMETRO_APLICADO) REFERENCES RRHH_PLANILLA_PARAMETRO (ID_PARAMETRO),
    CONSTRAINT FK_PD_ESTADO_EMISION FOREIGN KEY (ID_ESTADO_EMISION) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PD_PLANILLA ON RRHH_PLANILLA_DETALLE (ID_PLANILLA_MENSUAL);
CREATE INDEX IX_PD_CONTRATO ON RRHH_PLANILLA_DETALLE (ID_CONTRATO);
CREATE INDEX IX_PD_REFERENCIA ON RRHH_PLANILLA_DETALLE (TIPO_REFERENCIA, ID_REFERENCIA);

-- Puente para LOCADOR POR_HORA: un contrato por hora puede tener varias
-- RRHH_CONTRATO_PROYECTO (distintos proyectos, posiblemente distinta
-- moneda). Un detalle de planilla junta las filas de RRHH_CONTRATO_HORAS
-- del mes que compartan moneda -- si un mes tiene horas en mas de una
-- moneda para el mismo contrato, ese contrato se excluye de la
-- generacion automatica (ver generarPlanillaMensualAction) y queda
-- marcado "requiere generacion manual" en la UI. UQ_PDH_HORAS asegura
-- que una fila de horas solo se cuente en un detalle de planilla.
CREATE TABLE RRHH_PLANILLA_DETALLE_HORAS (
    ID_PLANILLA_DETALLE   INT UNSIGNED NOT NULL,
    ID_CONTRATO_HORAS      INT UNSIGNED NOT NULL,
    PRIMARY KEY (ID_PLANILLA_DETALLE, ID_CONTRATO_HORAS),
    CONSTRAINT FK_PDH_DETALLE FOREIGN KEY (ID_PLANILLA_DETALLE) REFERENCES RRHH_PLANILLA_DETALLE (ID_PLANILLA_DETALLE),
    CONSTRAINT FK_PDH_HORAS FOREIGN KEY (ID_CONTRATO_HORAS) REFERENCES RRHH_CONTRATO_HORAS (ID_CONTRATO_HORAS),
    CONSTRAINT UQ_PDH_HORAS UNIQUE (ID_CONTRATO_HORAS)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
