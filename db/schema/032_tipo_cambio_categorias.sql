-- =====================================================================
-- Tipo de cambio (TC) por categoria de negocio -- costos laborales,
-- prestamos, compras y ventas/ingresos, cada uno con su propio valor
-- vigente, independientes entre si (no se derivan automaticamente del
-- TC compra/venta oficial de SUNAT, cada categoria se fija a mano segun
-- decida Facturacion). "Vigente" = la fila mas reciente de
-- TIPO_CAMBIO_HISTORICO para esa categoria -- ledger de solo insertar
-- (nunca se actualiza una fila existente), mismo patron que
-- RRHH_CONTRATO_HORAS/COMPRA_PAGO: fijar un TC nuevo es agregar una
-- fila, el historico completo queda solo sin necesidad de una tabla
-- aparte para "el valor actual".
--
-- TIPO_CAMBIO_SUNAT_DIA es una cache de referencia aparte (NO alimenta
-- las categorias de arriba, ver seed 030): el TC oficial SUNAT compra/
-- venta del dia, solo para mostrarlo en pantalla como apoyo al fijar un
-- TC a mano. Una fila por fecha (PK), consultado a la API una sola vez
-- por dia -- ver src/lib/facturacion/tipo-cambio-sunat.ts.
-- =====================================================================

CREATE TABLE IF NOT EXISTS TIPO_CAMBIO_HISTORICO (
    ID_TIPO_CAMBIO     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CATEGORIA_TC    INT UNSIGNED NOT NULL,
    VALOR              DECIMAL(10,4) NOT NULL,
    USUARIO_CREACION   INT UNSIGNED NULL,
    FECHA_CREACION     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_TC_HISTORICO_CATEGORIA FOREIGN KEY (ID_CATEGORIA_TC) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_TC_HISTORICO_CATEGORIA ON TIPO_CAMBIO_HISTORICO (ID_CATEGORIA_TC, FECHA_CREACION);

CREATE TABLE IF NOT EXISTS TIPO_CAMBIO_SUNAT_DIA (
    FECHA              DATE PRIMARY KEY,
    TC_COMPRA          DECIMAL(10,4) NOT NULL,
    TC_VENTA           DECIMAL(10,4) NOT NULL,
    FECHA_CREACION     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
