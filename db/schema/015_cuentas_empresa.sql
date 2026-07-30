-- =====================================================================
-- 015_cuentas_empresa.sql
-- Modulo de cuentas: control de las cuentas de la empresa (bancarias en
-- soles/dolares por banco, cuenta de detracciones) y de posiciones a
-- favor frente a SUNAT (IGV a favor, Renta a favor) -- estas ultimas no
-- tienen banco ni numero de cuenta, solo saldo.
--
-- CUENTA_MOVIMIENTO es el libro de ingresos/egresos de cada cuenta.
-- TIPO_REFERENCIA/ID_REFERENCIA es una referencia generica (sin FK, por
-- diseño) para enlazar un movimiento a su origen en otro modulo cuando
-- exista -- hoy solo se usa TIPO_REFERENCIA='RRHH_CONTRATO' (pago de un
-- contrato de planilla/locador). Los modulos de compras y de tareas
-- todavia no existen; quedan mapeados para conectarse del mismo modo
-- cuando se construyan.
-- =====================================================================

CREATE TABLE IF NOT EXISTS CUENTA_EMPRESA (
    ID_CUENTA                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_TIPO_CUENTA           INT UNSIGNED NOT NULL,
    ID_BANCO                 INT UNSIGNED NULL,
    ID_MONEDA                INT UNSIGNED NULL,
    NOMBRE                   VARCHAR(150) NOT NULL,
    NRO_CUENTA               VARCHAR(40)  NULL,
    CCI                      VARCHAR(30)  NULL,
    SALDO_INICIAL            DECIMAL(14,2) NOT NULL DEFAULT 0,
    SALDO_ACTUAL             DECIMAL(14,2) NOT NULL DEFAULT 0,
    ID_ESTADO                INT UNSIGNED NOT NULL,
    FECHA_CREACION           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    USUARIO_CREACION         INT UNSIGNED NULL,
    USUARIO_MODIFICACION     INT UNSIGNED NULL,
    CONSTRAINT FK_CUENTA_TIPO FOREIGN KEY (ID_TIPO_CUENTA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_CUENTA_BANCO FOREIGN KEY (ID_BANCO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_CUENTA_MONEDA FOREIGN KEY (ID_MONEDA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_CUENTA_ESTADO FOREIGN KEY (ID_ESTADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CUENTA_TIPO_ESTADO ON CUENTA_EMPRESA (ID_TIPO_CUENTA, ID_ESTADO);

CREATE TABLE IF NOT EXISTS CUENTA_MOVIMIENTO (
    ID_MOVIMIENTO            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CUENTA                INT UNSIGNED NOT NULL,
    ID_TIPO_MOVIMIENTO       INT UNSIGNED NOT NULL,
    FECHA_MOVIMIENTO         DATE         NOT NULL,
    MONTO                    DECIMAL(14,2) NOT NULL,
    CONCEPTO                 VARCHAR(250) NOT NULL,
    TIPO_REFERENCIA          VARCHAR(50)  NULL,
    ID_REFERENCIA            INT UNSIGNED NULL,
    SALDO_RESULTANTE         DECIMAL(14,2) NOT NULL,
    ID_ESTADO                INT UNSIGNED NOT NULL,
    FECHA_CREACION           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    USUARIO_CREACION         INT UNSIGNED NULL,
    CONSTRAINT FK_MOVIMIENTO_CUENTA FOREIGN KEY (ID_CUENTA) REFERENCES CUENTA_EMPRESA (ID_CUENTA),
    CONSTRAINT FK_MOVIMIENTO_TIPO FOREIGN KEY (ID_TIPO_MOVIMIENTO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_MOVIMIENTO_ESTADO FOREIGN KEY (ID_ESTADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_MOVIMIENTO_CUENTA_FECHA ON CUENTA_MOVIMIENTO (ID_CUENTA, FECHA_MOVIMIENTO, ID_MOVIMIENTO);
