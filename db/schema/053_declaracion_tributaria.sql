-- =====================================================================
-- 053_declaracion_tributaria.sql
-- Modulo de impuestos: carga de las declaraciones mensuales (PDT 621,
-- IGV + pago a cuenta de Renta) y de la Declaracion Jurada Anual de
-- Renta. Carga manual (no se parsea ningun PDT/Excel) + archivo de
-- respaldo (constancia de SUNAT) -- mismo criterio que el resto del
-- sistema (ej. SubirConformidadFirmadaForm).
--
-- 1 fila = 1 periodo tributario (mes+anio para la mensual, solo anio
-- para la DJ anual -- MES=0 para la anual, NUNCA NULL, porque un UNIQUE
-- con NULL no bloquea duplicados en MySQL). Las columnas especificas de
-- cada tipo quedan NULL cuando no aplican (ver columnas IGV_*/RENTA_*
-- vs las de la DJ anual).
--
-- Al "presentar" se actualiza el saldo de las cuentas IGV_FAVOR/
-- RENTA_FAVOR (si el periodo genero saldo a favor) via el mismo
-- CUENTA_MOVIMIENTO/SP_CUENTA_MOVIMIENTO_REGISTRAR que ya usa el resto
-- del sistema -- ID_MOVIMIENTO_CREDITO guarda esa referencia. Si hay
-- monto por pagar, se paga aparte (como un Pasivo) con el mismo patron
-- de dos pasos sin transacciones anidadas que ya usa SP_PASIVO_CUOTA_MARCAR_PAGADA
-- (ver sp_declaracion_tributaria.sql).
-- =====================================================================

CREATE TABLE DECLARACION_TRIBUTARIA (
    ID_DECLARACION            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_TIPO_DECLARACION       INT UNSIGNED NOT NULL,
    ANIO                        SMALLINT UNSIGNED NOT NULL,
    MES                         TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 0 = no aplica (DJ anual), 1-12 para la mensual
    FECHA_VENCIMIENTO          DATE NOT NULL, -- limite de SUNAT para presentar Y pagar (cronograma por ultimo digito de RUC)
    ID_ESTADO_DECLARACION      INT UNSIGNED NOT NULL, -- BORRADOR/PRESENTADA/PAGADA/ANULADA

    -- IGV_RENTA_MENSUAL (NULL si es DJ_ANUAL_RENTA)
    VENTAS_GRAVADAS             DECIMAL(14,2) NULL,
    COMPRAS_GRAVADAS            DECIMAL(14,2) NULL,
    IGV_VENTAS                  DECIMAL(14,2) NULL,
    IGV_COMPRAS                 DECIMAL(14,2) NULL,
    IGV_RESULTANTE               DECIMAL(14,2) NULL, -- positivo = a pagar, negativo = saldo a favor del periodo
    PAGO_A_CUENTA_RENTA         DECIMAL(14,2) NULL,

    -- DJ_ANUAL_RENTA (NULL si es IGV_RENTA_MENSUAL)
    IMPUESTO_CALCULADO_RENTA    DECIMAL(14,2) NULL,
    PAGOS_A_CUENTA_ACUMULADOS   DECIMAL(14,2) NULL,
    SALDO_RENTA                  DECIMAL(14,2) NULL, -- positivo = por regularizar (pagar), negativo = a favor

    MONTO_TOTAL_A_PAGAR         DECIMAL(14,2) NOT NULL DEFAULT 0,

    DOCUMENTO_PATH               VARCHAR(300) NULL, -- constancia/comprobante de SUNAT (respaldo, no se genera, se sube)
    NOTAS                        VARCHAR(500) NULL,
    MOTIVO_ANULACION            VARCHAR(300) NULL,

    FECHA_PRESENTACION          DATETIME NULL,
    FECHA_PAGO                   DATETIME NULL,
    ID_CUENTA_PAGO               INT UNSIGNED NULL, -- de donde salio el pago
    ID_MOVIMIENTO_PAGO           INT UNSIGNED NULL, -- egreso registrado en CUENTA_MOVIMIENTO
    ID_MOVIMIENTO_CREDITO        INT UNSIGNED NULL, -- ingreso a IGV_FAVOR/RENTA_FAVOR si el periodo genero saldo a favor

    USUARIO_CREACION             INT UNSIGNED NULL,
    FECHA_CREACION                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    USUARIO_MODIFICACION         INT UNSIGNED NULL,
    FECHA_MODIFICACION            DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT FK_DECLARACION_TIPO FOREIGN KEY (ID_TIPO_DECLARACION) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_DECLARACION_ESTADO FOREIGN KEY (ID_ESTADO_DECLARACION) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_DECLARACION_CUENTA_PAGO FOREIGN KEY (ID_CUENTA_PAGO) REFERENCES CUENTA_EMPRESA (ID_CUENTA),
    CONSTRAINT FK_DECLARACION_MOVIMIENTO_PAGO FOREIGN KEY (ID_MOVIMIENTO_PAGO) REFERENCES CUENTA_MOVIMIENTO (ID_MOVIMIENTO),
    CONSTRAINT FK_DECLARACION_MOVIMIENTO_CREDITO FOREIGN KEY (ID_MOVIMIENTO_CREDITO) REFERENCES CUENTA_MOVIMIENTO (ID_MOVIMIENTO),
    CONSTRAINT UQ_DECLARACION_PERIODO UNIQUE (ID_TIPO_DECLARACION, ANIO, MES)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_DECLARACION_ESTADO_VENCIMIENTO ON DECLARACION_TRIBUTARIA (ID_ESTADO_DECLARACION, FECHA_VENCIMIENTO);
