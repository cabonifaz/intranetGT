-- =====================================================================
-- Cache de "ya se generaron las instancias pendientes de hoy" -- mismo
-- patron que TIPO_CAMBIO_SUNAT_DIA (032_tipo_cambio_categorias.sql): una
-- fila por fecha (PK), consultada/creada una sola vez al dia desde
-- asegurarInstanciasGeneradasDelDia() (ver src/lib/pagos-recurrentes/
-- auto-generar.ts, llamado desde facturacion/layout.tsx en cada request
-- a Facturacion). No hay cron real en esta app (Next.js + Server
-- Actions), asi que "automatico" se logra dejando que el primer
-- visitante del dia lo dispare.
-- =====================================================================

CREATE TABLE IF NOT EXISTS PAGO_RECURRENTE_GENERACION_DIA (
    FECHA              DATE PRIMARY KEY,
    FECHA_CREACION     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
