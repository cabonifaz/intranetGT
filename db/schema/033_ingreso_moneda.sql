-- =====================================================================
-- PROYECTO_INGRESO gana su propia moneda -- hasta ahora asumia
-- implicitamente la del proyecto (no habia forma de registrar un
-- anticipo/pago en otra moneda). Mismo criterio que ya existe en COMPRA/
-- PROYECTO_COSTO_MANO_OBRA/PASIVO: moneda propia, independiente de la
-- del proyecto, mas TIPO_CAMBIO para convertir cuando difieren (ver
-- 031_tipo_cambio_proyecto.sql para el porque).
-- =====================================================================

ALTER TABLE PROYECTO_INGRESO
    ADD COLUMN ID_MONEDA INT UNSIGNED NULL AFTER MONTO;

-- Backfill: las filas existentes heredan la moneda de su proyecto (igual
-- criterio que el backfill de PROYECTO_COSTO_MANO_OBRA.ID_MONEDA).
UPDATE PROYECTO_INGRESO pi
  JOIN PROYECTO p ON p.ID_PROYECTO = pi.ID_PROYECTO
   SET pi.ID_MONEDA = p.ID_MONEDA
 WHERE pi.ID_MONEDA IS NULL;

ALTER TABLE PROYECTO_INGRESO
    MODIFY COLUMN ID_MONEDA INT UNSIGNED NOT NULL;

ALTER TABLE PROYECTO_INGRESO
    ADD CONSTRAINT FK_PROYECTO_INGRESO_MONEDA FOREIGN KEY (ID_MONEDA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO);

ALTER TABLE PROYECTO_INGRESO
    ADD COLUMN TIPO_CAMBIO DECIMAL(10,4) NULL AFTER ID_MONEDA;
