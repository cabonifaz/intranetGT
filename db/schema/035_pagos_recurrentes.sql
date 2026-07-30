-- =====================================================================
-- Cronograma de pagos recurrentes -- gastos que se repiten periodo tras
-- periodo (alquiler, internet, software, seguros, mantenimientos...)
-- sin que alguien tenga que cargarlos a mano cada vez. Mismo patron
-- plantilla + instancias que RRHH_CONTRATO/RRHH_CONTRATO_PERIODO_PAGO:
-- PAGO_RECURRENTE es la configuracion (monto fijo o variable, cada
-- cuantos meses, dia de vencimiento, cuenta de pago por defecto, proyecto
-- opcional), PAGO_RECURRENTE_INSTANCIA es el ledger de ocurrencias
-- generadas (insertar/marcar pagado/borrar, sin upsert -- mismo patron
-- que RRHH_CONTRATO_HORAS/PROYECTO_COSTO_MANO_OBRA).
--
-- ID_PROYECTO es opcional: un pago recurrente "administrativo/general" o
-- transversal a varios proyectos simplemente no lo tiene -- no existe
-- (ni aca ni en ningun otro modulo del sistema) un mecanismo de reparto
-- automatico entre proyectos; si de verdad hay que cargarlo a proyectos
-- especificos, se crean pagos recurrentes separados uno por proyecto.
--
-- ID_CUENTA_PAGO_DEFAULT es solo una sugerencia: cada instancia tiene su
-- propia ID_CUENTA_PAGO (hereda la del padre al generarse, pero se puede
-- cambiar antes o al pagar) -- mismo criterio que PASIVO.ID_CUENTA_PAGO
-- vs PASIVO_CUOTA.ID_CUENTA_PAGO ya usa hoy.
--
-- TIPO_CAMBIO vive en el padre (no por instancia) -- la moneda de un
-- pago recurrente no cambia mes a mes, mismo criterio que
-- RRHH_CONTRATO_PROYECTO.ID_MONEDA/TIPO_CAMBIO (fijo por config, cada
-- RRHH_CONTRATO_HORAS generada no tiene su propia moneda). Obligatorio
-- SOLO si ID_PROYECTO viene informado y su moneda es distinta a
-- ID_MONEDA (no-op silencioso si falta, ver SP_PAGO_RECURRENTE_CREAR) --
-- si no hay proyecto no hace falta convertir nada.
-- =====================================================================

CREATE TABLE PAGO_RECURRENTE (
    ID_PAGO_RECURRENTE     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    NOMBRE                 VARCHAR(150) NOT NULL,
    DESCRIPCION            VARCHAR(300) NULL,
    ES_VARIABLE            TINYINT NOT NULL DEFAULT 0,
    MONTO_FIJO             DECIMAL(12,2) NULL,
    ID_MONEDA              INT UNSIGNED NOT NULL,
    TIPO_CAMBIO            DECIMAL(10,4) NULL,
    INTERVALO_MESES        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    DIA_VENCIMIENTO        TINYINT UNSIGNED NOT NULL,
    FECHA_INICIO           DATE NOT NULL,
    FECHA_FIN              DATE NULL,
    ID_PROYECTO            INT UNSIGNED NULL,
    ID_CUENTA_PAGO_DEFAULT INT UNSIGNED NULL,
    ID_ESTADO              INT UNSIGNED NOT NULL,
    USUARIO_CREACION       INT UNSIGNED NULL,
    FECHA_CREACION         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    USUARIO_MODIFICACION   INT UNSIGNED NULL,
    FECHA_MODIFICACION     DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_PR_MONEDA FOREIGN KEY (ID_MONEDA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PR_PROYECTO FOREIGN KEY (ID_PROYECTO) REFERENCES PROYECTO (ID_PROYECTO),
    CONSTRAINT FK_PR_CUENTA FOREIGN KEY (ID_CUENTA_PAGO_DEFAULT) REFERENCES CUENTA_EMPRESA (ID_CUENTA),
    CONSTRAINT FK_PR_ESTADO FOREIGN KEY (ID_ESTADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PR_PROYECTO ON PAGO_RECURRENTE (ID_PROYECTO);
CREATE INDEX IX_PR_ESTADO ON PAGO_RECURRENTE (ID_ESTADO);

CREATE TABLE PAGO_RECURRENTE_INSTANCIA (
    ID_INSTANCIA        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_PAGO_RECURRENTE  INT UNSIGNED NOT NULL,
    PERIODO             VARCHAR(100) NOT NULL,
    FECHA_VENCIMIENTO   DATE NOT NULL,
    MONTO               DECIMAL(12,2) NOT NULL,
    ID_CUENTA_PAGO      INT UNSIGNED NULL,
    FECHA_PAGO          DATE NULL,
    ID_MOVIMIENTO       INT UNSIGNED NULL,
    USUARIO_CREACION    INT UNSIGNED NULL,
    FECHA_CREACION      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_PRI_PAGO_RECURRENTE FOREIGN KEY (ID_PAGO_RECURRENTE) REFERENCES PAGO_RECURRENTE (ID_PAGO_RECURRENTE),
    CONSTRAINT FK_PRI_CUENTA FOREIGN KEY (ID_CUENTA_PAGO) REFERENCES CUENTA_EMPRESA (ID_CUENTA),
    CONSTRAINT FK_PRI_MOVIMIENTO FOREIGN KEY (ID_MOVIMIENTO) REFERENCES CUENTA_MOVIMIENTO (ID_MOVIMIENTO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PRI_PAGO_RECURRENTE ON PAGO_RECURRENTE_INSTANCIA (ID_PAGO_RECURRENTE);
CREATE INDEX IX_PRI_VENCIMIENTO ON PAGO_RECURRENTE_INSTANCIA (FECHA_VENCIMIENTO);
