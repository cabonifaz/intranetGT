-- =====================================================================
-- La persona de una asignacion de mano de obra ahora se elige, no se
-- escribe: o un contrato de RRHH (ya existia) o un proveedor marcado
-- como persona natural (freelance/tecnico independiente que factura
-- como proveedor). Cada linea tambien elige su propia moneda, mismo
-- criterio que ya existe en COMPRA (cada compra tiene su ID_MONEDA
-- independiente de la del proyecto).
-- =====================================================================

ALTER TABLE PROVEEDOR
    ADD COLUMN ES_PERSONA_NATURAL TINYINT(1) NOT NULL DEFAULT 0 AFTER RAZON_SOCIAL;

ALTER TABLE PROYECTO_COSTO_MANO_OBRA
    ADD COLUMN ID_PROVEEDOR INT UNSIGNED NULL AFTER ID_CONTRATO;

ALTER TABLE PROYECTO_COSTO_MANO_OBRA
    ADD CONSTRAINT FK_PROYECTO_MANO_OBRA_PROVEEDOR FOREIGN KEY (ID_PROVEEDOR) REFERENCES PROVEEDOR (ID_PROVEEDOR);

CREATE INDEX IX_PROYECTO_MANO_OBRA_PROVEEDOR ON PROYECTO_COSTO_MANO_OBRA (ID_PROVEEDOR);

ALTER TABLE PROYECTO_COSTO_MANO_OBRA
    ADD COLUMN ID_MONEDA INT UNSIGNED NULL AFTER MONTO;

-- Backfill: las filas existentes heredan la moneda de su proyecto.
UPDATE PROYECTO_COSTO_MANO_OBRA mo
  JOIN PROYECTO p ON p.ID_PROYECTO = mo.ID_PROYECTO
   SET mo.ID_MONEDA = p.ID_MONEDA
 WHERE mo.ID_MONEDA IS NULL;

ALTER TABLE PROYECTO_COSTO_MANO_OBRA
    MODIFY COLUMN ID_MONEDA INT UNSIGNED NOT NULL;

ALTER TABLE PROYECTO_COSTO_MANO_OBRA
    ADD CONSTRAINT FK_PROYECTO_MANO_OBRA_MONEDA FOREIGN KEY (ID_MONEDA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO);

-- La persona ahora siempre es una de las dos FK de arriba.
ALTER TABLE PROYECTO_COSTO_MANO_OBRA
    DROP COLUMN PERSONA_DESCRIPCION;
