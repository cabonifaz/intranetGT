-- =====================================================================
-- 021_cliente_contacto.sql
-- Contactos de un cliente (puede haber varios, segun area/asunto de
-- interes). Tabla propia, NO pasa por USUARIO -- estas personas nunca
-- inician sesion en la intranet, a diferencia del Directorio Corporativo
-- (RRHH_EMPLEADO), que esta atado 1:1 a USUARIO. Se muestran en
-- /rrhh/directorio como una pestaña aparte, sin tocar RRHH_EMPLEADO/
-- USUARIO ni sus procedimientos.
--
-- AREA/CARGO/TEMA_INTERES/RELACION_GT son texto libre (no catalogos
-- MAESTRO_MAESTRO): varian por cliente, no hay un conjunto fijo de
-- valores razonable a nivel de toda la empresa. AREA es el departamento
-- del contacto EN EL CLIENTE -- no se reutiliza la tabla AREA interna de
-- GT, que es la organizacion de otra empresa.
-- =====================================================================

CREATE TABLE IF NOT EXISTS CLIENTE_CONTACTO (
    ID_CONTACTO              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CLIENTE                INT UNSIGNED NOT NULL,
    NOMBRES                   VARCHAR(100) NOT NULL,
    APELLIDOS                 VARCHAR(100) NOT NULL,
    AREA                      VARCHAR(100) NULL,
    CARGO                     VARCHAR(100) NULL,
    TEMA_INTERES              VARCHAR(300) NULL,
    RELACION_GT               VARCHAR(200) NULL,
    TELEFONO                  VARCHAR(30)  NULL,
    CORREO                    VARCHAR(150) NULL,
    ID_ESTADO                 INT UNSIGNED NOT NULL,
    FECHA_CREACION            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION        DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    USUARIO_CREACION          INT UNSIGNED NULL,
    USUARIO_MODIFICACION      INT UNSIGNED NULL,
    CONSTRAINT FK_CLIENTE_CONTACTO_CLIENTE FOREIGN KEY (ID_CLIENTE) REFERENCES CLIENTE (ID_CLIENTE),
    CONSTRAINT FK_CLIENTE_CONTACTO_ESTADO FOREIGN KEY (ID_ESTADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CLIENTE_CONTACTO_CLIENTE ON CLIENTE_CONTACTO (ID_CLIENTE);
