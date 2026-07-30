-- =====================================================================
-- 010_identidad_estructurada.sql
-- Las personas del directorio pueden ser de cualquier nacionalidad y
-- tener distintos tipos de documento de identidad (no todos son DNI
-- peruano). Se estructura:
--  - ID_TIPO_DOCUMENTO: catalogo (DNI, Carne de Extranjeria, Pasaporte, RUC).
--  - DNI se renombra a NRO_DOCUMENTO (ya no asume que siempre es un DNI).
--  - ID_PAIS / ID_CIUDAD: catalogo jerarquico via MAESTRO_MAESTRO.ID_PADRE
--    (TIPO_MAESTRO='CIUDAD' con ID_PADRE apuntando a su TIPO_MAESTRO='PAIS').
-- =====================================================================

ALTER TABLE RRHH_EMPLEADO
    CHANGE COLUMN DNI NRO_DOCUMENTO VARCHAR(20) NULL,
    ADD COLUMN ID_TIPO_DOCUMENTO INT UNSIGNED NULL AFTER ID_USUARIO,
    ADD COLUMN ID_PAIS INT UNSIGNED NULL AFTER DIRECCION,
    ADD COLUMN ID_CIUDAD INT UNSIGNED NULL AFTER ID_PAIS,
    ADD CONSTRAINT FK_RRHH_EMPLEADO_TIPO_DOC FOREIGN KEY (ID_TIPO_DOCUMENTO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    ADD CONSTRAINT FK_RRHH_EMPLEADO_PAIS FOREIGN KEY (ID_PAIS) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    ADD CONSTRAINT FK_RRHH_EMPLEADO_CIUDAD FOREIGN KEY (ID_CIUDAD) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO);
