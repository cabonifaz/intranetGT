-- =====================================================================
-- El acreedor de un pasivo ahora se elige, no se escribe: o un
-- PROVEEDOR existente (empresa que presta servicios financieros) o una
-- persona natural tomada de cualquier contacto activo del Directorio
-- (DIRECTORIO_CONTACTO_EXTERNO). Sin backfill: el texto libre existente
-- en ACREEDOR se descarta (confirmado -- son pasivos de prueba).
-- =====================================================================

ALTER TABLE PASIVO
    ADD COLUMN ID_PROVEEDOR INT UNSIGNED NULL AFTER ID_TIPO_PASIVO;

ALTER TABLE PASIVO
    ADD COLUMN ID_CONTACTO INT UNSIGNED NULL AFTER ID_PROVEEDOR;

ALTER TABLE PASIVO
    ADD CONSTRAINT FK_PASIVO_PROVEEDOR FOREIGN KEY (ID_PROVEEDOR) REFERENCES PROVEEDOR (ID_PROVEEDOR);

ALTER TABLE PASIVO
    ADD CONSTRAINT FK_PASIVO_CONTACTO FOREIGN KEY (ID_CONTACTO) REFERENCES DIRECTORIO_CONTACTO_EXTERNO (ID_CONTACTO);

CREATE INDEX IX_PASIVO_PROVEEDOR ON PASIVO (ID_PROVEEDOR);
CREATE INDEX IX_PASIVO_CONTACTO ON PASIVO (ID_CONTACTO);

ALTER TABLE PASIVO
    DROP COLUMN ACREEDOR;
