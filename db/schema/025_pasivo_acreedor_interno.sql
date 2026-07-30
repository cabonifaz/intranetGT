-- =====================================================================
-- El acreedor de un pasivo tambien puede ser personal interno de GT
-- (ej. gerencia u otro rol que presto dinero personalmente a la
-- empresa) -- tercera fuente ademas de Proveedor y Contacto del
-- Directorio, referenciando USUARIO directamente (mismo origen que usa
-- el Directorio Corporativo de empleados).
-- =====================================================================

ALTER TABLE PASIVO
    ADD COLUMN ID_USUARIO INT UNSIGNED NULL AFTER ID_CONTACTO;

ALTER TABLE PASIVO
    ADD CONSTRAINT FK_PASIVO_USUARIO FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO (ID_USUARIO);

CREATE INDEX IX_PASIVO_USUARIO ON PASIVO (ID_USUARIO);
