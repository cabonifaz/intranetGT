-- =====================================================================
-- Cuanto de la mano de obra "comprometida" (asignacion manual, horas por
-- hora) ya se pago -- mismo patron que PASIVO_CUOTA: FECHA_PAGO/
-- ID_MOVIMIENTO en la propia fila (no una tabla hija tipo COMPRA_PAGO,
-- porque a diferencia de una compra esto no se paga en cuotas
-- parciales: una asignacion o un periodo de horas se paga de una sola
-- vez). La tarifa unica de locadores POR_PROYECTO no necesita columnas
-- nuevas -- reutiliza los CUENTA_MOVIMIENTO que "Pagos a contratos" ya
-- crea hoy contra el RRHH_CONTRATO completo.
-- =====================================================================

ALTER TABLE PROYECTO_COSTO_MANO_OBRA ADD COLUMN FECHA_PAGO DATE NULL;
ALTER TABLE PROYECTO_COSTO_MANO_OBRA ADD COLUMN ID_MOVIMIENTO INT UNSIGNED NULL;
ALTER TABLE PROYECTO_COSTO_MANO_OBRA
    ADD CONSTRAINT FK_PROYECTO_MANO_OBRA_MOVIMIENTO FOREIGN KEY (ID_MOVIMIENTO) REFERENCES CUENTA_MOVIMIENTO (ID_MOVIMIENTO);

ALTER TABLE RRHH_CONTRATO_HORAS ADD COLUMN FECHA_PAGO DATE NULL;
ALTER TABLE RRHH_CONTRATO_HORAS ADD COLUMN ID_MOVIMIENTO INT UNSIGNED NULL;
ALTER TABLE RRHH_CONTRATO_HORAS
    ADD CONSTRAINT FK_CH_MOVIMIENTO FOREIGN KEY (ID_MOVIMIENTO) REFERENCES CUENTA_MOVIMIENTO (ID_MOVIMIENTO);
