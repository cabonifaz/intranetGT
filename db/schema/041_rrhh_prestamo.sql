-- =====================================================================
-- Prestamos y adelantos de sueldo de la empresa a un colaborador (mismo
-- modelo, ID_TIPO_PRESTAMO los distingue), con su cronograma de cuotas
-- que se descuentan en la Planilla Mensual y su compromiso de pago (un
-- PDF con todo el detalle + cronograma, que el colaborador firma y se
-- sube firmado -- el descuento solo se aplica una vez firmado).
--
-- Cada cuota se agenda contra un periodo (ANIO+MES), la misma
-- granularidad que RRHH_PLANILLA_MENSUAL -- por eso agregar una cuota
-- extra "para julio/diciembre" (gratificaciones) es simplemente una cuota
-- mas con ese MES, sin modelar gratificacion aparte.
--
-- MONEDA: el prestamo y sus cuotas estan en ID_MONEDA. La planilla es
-- siempre en soles (ver calculo.ts), asi que si la moneda no es PEN el
-- prestamo guarda un TIPO_CAMBIO pactado (soles por unidad) y cada cuota
-- guarda en MONTO_DESCONTADO_SOLES lo que efectivamente se resto de la
-- planilla cuando se vinculo a un detalle -- el compromiso firmado deja
-- ese TC por escrito, no cambia si despues cambia el TC vigente.
--
-- Una cuota se "reserva" (ID_PLANILLA_DETALLE) al generar la planilla, y
-- recien pasa a DESCONTADA cuando ese detalle se EMITE -- mismo criterio
-- de "se congela al emitir" que el resto de RRHH_PLANILLA_DETALLE.
-- =====================================================================

CREATE TABLE IF NOT EXISTS RRHH_PRESTAMO (
    ID_PRESTAMO                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_USUARIO                  INT UNSIGNED NOT NULL,
    ID_TIPO_PRESTAMO            INT UNSIGNED NOT NULL,
    MONTO_TOTAL                 DECIMAL(12,2) NOT NULL,
    ID_MONEDA                   INT UNSIGNED NOT NULL,
    TIPO_CAMBIO                 DECIMAL(10,4) NULL,
    DESCRIPCION                 VARCHAR(300) NULL,
    FECHA_ORIGEN                DATE NOT NULL,
    ID_CUENTA_DESEMBOLSO        INT UNSIGNED NULL,
    ID_MOVIMIENTO_DESEMBOLSO    INT UNSIGNED NULL,
    ID_ESTADO_PRESTAMO          INT UNSIGNED NOT NULL,
    DOCUMENTO_FIRMADO_PATH      VARCHAR(300) NULL,
    FECHA_FIRMA_COMPROMISO      DATETIME NULL,
    USUARIO_FIRMA_REGISTRO      INT UNSIGNED NULL,
    MOTIVO_ANULACION            VARCHAR(300) NULL,
    FECHA_ANULACION             DATETIME NULL,
    USUARIO_ANULACION           INT UNSIGNED NULL,
    USUARIO_CREACION            INT UNSIGNED NULL,
    FECHA_CREACION              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION          DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_PRESTAMO_USUARIO FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO (ID_USUARIO),
    CONSTRAINT FK_PRESTAMO_TIPO FOREIGN KEY (ID_TIPO_PRESTAMO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PRESTAMO_MONEDA FOREIGN KEY (ID_MONEDA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PRESTAMO_CUENTA FOREIGN KEY (ID_CUENTA_DESEMBOLSO) REFERENCES CUENTA_EMPRESA (ID_CUENTA),
    CONSTRAINT FK_PRESTAMO_MOVIMIENTO FOREIGN KEY (ID_MOVIMIENTO_DESEMBOLSO) REFERENCES CUENTA_MOVIMIENTO (ID_MOVIMIENTO),
    CONSTRAINT FK_PRESTAMO_ESTADO FOREIGN KEY (ID_ESTADO_PRESTAMO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PRESTAMO_USUARIO ON RRHH_PRESTAMO (ID_USUARIO, ID_ESTADO_PRESTAMO);

CREATE TABLE IF NOT EXISTS RRHH_PRESTAMO_CUOTA (
    ID_CUOTA                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_PRESTAMO                  INT UNSIGNED NOT NULL,
    NRO_CUOTA                    INT UNSIGNED NOT NULL,
    ANIO                         SMALLINT UNSIGNED NOT NULL,
    MES                          TINYINT UNSIGNED NOT NULL,
    MONTO                        DECIMAL(12,2) NOT NULL,
    CALCULO_AUTOMATICO           TINYINT NOT NULL DEFAULT 1,
    ID_ESTADO_CUOTA              INT UNSIGNED NOT NULL,
    ID_PLANILLA_DETALLE          INT UNSIGNED NULL,
    MONTO_DESCONTADO_SOLES       DECIMAL(12,2) NULL,
    FECHA_DESCUENTO              DATETIME NULL,
    USUARIO_CREACION             INT UNSIGNED NULL,
    FECHA_CREACION               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION           DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_PRESTAMO_CUOTA_PRESTAMO FOREIGN KEY (ID_PRESTAMO) REFERENCES RRHH_PRESTAMO (ID_PRESTAMO),
    CONSTRAINT FK_PRESTAMO_CUOTA_ESTADO FOREIGN KEY (ID_ESTADO_CUOTA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    CONSTRAINT FK_PRESTAMO_CUOTA_DETALLE FOREIGN KEY (ID_PLANILLA_DETALLE) REFERENCES RRHH_PLANILLA_DETALLE (ID_PLANILLA_DETALLE)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PRESTAMO_CUOTA_PRESTAMO ON RRHH_PRESTAMO_CUOTA (ID_PRESTAMO);
CREATE INDEX IX_PRESTAMO_CUOTA_PERIODO ON RRHH_PRESTAMO_CUOTA (ANIO, MES, ID_ESTADO_CUOTA);
CREATE INDEX IX_PRESTAMO_CUOTA_DETALLE ON RRHH_PRESTAMO_CUOTA (ID_PLANILLA_DETALLE);

-- Suma de las cuotas de prestamo descontadas en este detalle (ya en
-- soles) -- se resta del neto junto con AFP/ONP y Renta.
ALTER TABLE RRHH_PLANILLA_DETALLE
    ADD COLUMN MONTO_DESCUENTO_PRESTAMO DECIMAL(12,2) NULL DEFAULT 0 AFTER MONTO_ESSALUD;
