-- =====================================================================
-- Tipo de cambio (TC) manual y congelado por transaccion. COMPRA,
-- PROYECTO_COSTO_MANO_OBRA y PASIVO ya elegian su propia moneda,
-- independiente de la del proyecto que enlazan (COMPRA.ID_PROYECTO,
-- PROYECTO_COSTO_MANO_OBRA.ID_PROYECTO NOT NULL, PASIVO.ID_PROYECTO),
-- pero nada convertia el monto a la moneda del proyecto -- todos los
-- buckets de costeo, el margen y el ledger de Movimientos sumaban MONTO
-- crudo sin importar la moneda de cada fila (ej. un gasto de mano de
-- obra en soles se sumaba tal cual a un proyecto en dolares).
--
-- TIPO_CAMBIO = "soles por dolar" (asi lo tipea/entiende cualquiera en
-- Peru, mismo criterio que el TC oficial SUNAT -- NO "cuantas unidades
-- de la moneda del proyecto equivalen a 1 de la fila", que fue el diseño
-- original y resulto ser un bug: los buckets de costeo multiplicaban
-- siempre por TIPO_CAMBIO sin importar el sentido de la conversion,
-- inflando de mas cualquier gasto en soles cargado a un proyecto en
-- dolares -- ver el CASE en sp_proyecto.sql, que multiplica solo cuando
-- la fila es en dolares y divide cuando es en soles). Se pide una sola
-- vez al registrar la fila (si esta enlazada a un proyecto y su moneda
-- es distinta a la de ese proyecto) y queda fijo para siempre -- mismo
-- criterio que PASIVO_CUOTA.MONTO/PROYECTO_HITO.MONTO: se calcula una
-- vez, no se recalcula si el TC del dia cambia despues. NULL cuando la
-- fila no esta enlazada a un proyecto, o cuando su moneda ya coincide
-- con la del proyecto (no hace falta convertir).
-- =====================================================================

ALTER TABLE COMPRA ADD COLUMN TIPO_CAMBIO DECIMAL(10,4) NULL AFTER ID_MONEDA;
ALTER TABLE PROYECTO_COSTO_MANO_OBRA ADD COLUMN TIPO_CAMBIO DECIMAL(10,4) NULL AFTER ID_MONEDA;
ALTER TABLE PASIVO ADD COLUMN TIPO_CAMBIO DECIMAL(10,4) NULL AFTER ID_MONEDA;
