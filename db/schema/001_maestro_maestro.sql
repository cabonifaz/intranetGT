-- =====================================================================
-- 001_maestro_maestro.sql
-- Tabla catalogo generica (patron "MAESTRO DE MAESTROS").
-- Todo valor tipo lookup (estados, tipos, categorias, dias de semana...)
-- vive aqui, discriminado por TIPO_MAESTRO. Agregar un valor nuevo es un
-- INSERT, nunca una migracion de esquema.
-- =====================================================================

CREATE TABLE IF NOT EXISTS MAESTRO_MAESTRO (
    ID_MAESTRO              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    TIPO_MAESTRO             VARCHAR(50)  NOT NULL,
    ID_PADRE                 INT UNSIGNED NULL,
    CODIGO                   VARCHAR(50)  NOT NULL,
    DESCRIPCION              VARCHAR(200) NOT NULL,
    ORDEN                    INT          NOT NULL DEFAULT 0,
    METADATA                 JSON         NULL,
    ID_ESTADO                INT UNSIGNED NOT NULL,
    FECHA_CREACION           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    USUARIO_CREACION         INT UNSIGNED NULL,
    USUARIO_MODIFICACION     INT UNSIGNED NULL,
    CONSTRAINT UQ_MAESTRO_TIPO_CODIGO UNIQUE (TIPO_MAESTRO, CODIGO),
    CONSTRAINT FK_MAESTRO_PADRE FOREIGN KEY (ID_PADRE) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_MAESTRO_TIPO_ESTADO_ORDEN ON MAESTRO_MAESTRO (TIPO_MAESTRO, ID_ESTADO, ORDEN);

-- Nota de bootstrap: ID_ESTADO no puede apuntar a un valor de MAESTRO_MAESTRO
-- que aun no existe. Se resuelve en el seed (ver db/seed/001_catalogos_base.sql)
-- creando primero las filas de TIPO_MAESTRO='ESTADO_GENERAL' con ID_ESTADO
-- autorreferenciado a si mismas (ACTIVO -> su propio ID, INACTIVO -> su propio ID).
