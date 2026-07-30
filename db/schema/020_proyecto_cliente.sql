-- =====================================================================
-- 020_proyecto_cliente.sql
-- Catalogo de clientes (para elegir en Proyectos, en vez de tipear el
-- nombre libremente) -- calco de PROVEEDOR (db/schema/017_compras.sql),
-- tabla propia porque necesita RUC/contacto, mas de lo que soporta
-- MAESTRO_MAESTRO.
--
-- PROYECTO.CLIENTE (texto libre) se reemplaza por ID_CLIENTE + ES_INTERNO:
-- un proyecto interno de GT no tiene cliente externo (ID_CLIENTE queda
-- NULL), en vez de inferirlo de que el campo este vacio.
-- =====================================================================

CREATE TABLE IF NOT EXISTS CLIENTE (
    ID_CLIENTE               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    RUC                      VARCHAR(11)  NULL,
    RAZON_SOCIAL             VARCHAR(150) NOT NULL,
    NOMBRE_CONTACTO          VARCHAR(100) NULL,
    TELEFONO                 VARCHAR(20)  NULL,
    CORREO                   VARCHAR(100) NULL,
    ID_ESTADO                INT UNSIGNED NOT NULL,
    FECHA_CREACION           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    USUARIO_CREACION         INT UNSIGNED NULL,
    USUARIO_MODIFICACION     INT UNSIGNED NULL,
    CONSTRAINT FK_CLIENTE_ESTADO FOREIGN KEY (ID_ESTADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CLIENTE_ESTADO ON CLIENTE (ID_ESTADO);

ALTER TABLE PROYECTO DROP COLUMN CLIENTE;
ALTER TABLE PROYECTO ADD COLUMN ID_CLIENTE INT UNSIGNED NULL AFTER ID_TIPO_PROYECTO;
ALTER TABLE PROYECTO ADD COLUMN ES_INTERNO TINYINT(1) NOT NULL DEFAULT 0 AFTER ID_CLIENTE;
ALTER TABLE PROYECTO ADD CONSTRAINT FK_PROYECTO_CLIENTE FOREIGN KEY (ID_CLIENTE) REFERENCES CLIENTE (ID_CLIENTE);
CREATE INDEX IX_PROYECTO_CLIENTE ON PROYECTO (ID_CLIENTE);
