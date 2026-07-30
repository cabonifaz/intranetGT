-- =====================================================================
-- 006_rrhh_directorio.sql
-- Primer modulo de negocio real (Fase 3): Directorio Corporativo, administrado por RRHH.
-- Datos propios del modulo, separados de USUARIO (que es solo credenciales
-- + identidad core) via 1:1 opcional -- no todo usuario tiene ficha todavia.
-- =====================================================================

CREATE TABLE IF NOT EXISTS RRHH_EMPLEADO (
    ID_EMPLEADO                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_USUARIO                  INT UNSIGNED NOT NULL,
    PUESTO                      VARCHAR(100) NULL,
    TELEFONO                    VARCHAR(30)  NULL,
    EXTENSION                   VARCHAR(10)  NULL,
    FECHA_INGRESO               DATE         NULL,
    FOTO_URL                    VARCHAR(300) NULL,
    ID_ESTADO                   INT UNSIGNED NOT NULL,
    FECHA_CREACION               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION           DATETIME    NULL ON UPDATE CURRENT_TIMESTAMP,
    USUARIO_MODIFICACION         INT UNSIGNED NULL,
    CONSTRAINT UQ_RRHH_EMPLEADO_USUARIO UNIQUE (ID_USUARIO),
    CONSTRAINT FK_RRHH_EMPLEADO_USUARIO FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO (ID_USUARIO),
    CONSTRAINT FK_RRHH_EMPLEADO_ESTADO FOREIGN KEY (ID_ESTADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
