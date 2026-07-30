-- =====================================================================
-- Un pasivo puede crearse para financiar directamente un pago puntual
-- (una compra, un periodo de sueldo, horas de locador, una asignacion
-- de mano de obra) en vez de pagarlo con una cuenta de la empresa --
-- el pasivo ES el pago, sin movimiento de caja. TIPO_REFERENCIA/
-- ID_REFERENCIA son genericos y sin FK, mismo criterio que
-- CUENTA_MOVIMIENTO. ID_PROYECTO es directo (no derivado por join)
-- porque no todo lo financiado tiene proyecto -- se autocompleta desde
-- el proyecto de lo que se financia cuando existe.
-- =====================================================================

ALTER TABLE PASIVO ADD COLUMN TIPO_REFERENCIA VARCHAR(50) NULL AFTER ID_USUARIO;
ALTER TABLE PASIVO ADD COLUMN ID_REFERENCIA INT UNSIGNED NULL AFTER TIPO_REFERENCIA;
ALTER TABLE PASIVO ADD COLUMN ID_PROYECTO INT UNSIGNED NULL AFTER ID_REFERENCIA;

ALTER TABLE PASIVO ADD CONSTRAINT FK_PASIVO_PROYECTO FOREIGN KEY (ID_PROYECTO) REFERENCES PROYECTO (ID_PROYECTO);

CREATE INDEX IX_PASIVO_REFERENCIA ON PASIVO (TIPO_REFERENCIA, ID_REFERENCIA);
CREATE INDEX IX_PASIVO_PROYECTO ON PASIVO (ID_PROYECTO);
