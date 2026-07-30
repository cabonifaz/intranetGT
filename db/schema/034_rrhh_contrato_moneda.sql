-- =====================================================================
-- RRHH_CONTRATO/RRHH_CONTRATO_PROYECTO ganan moneda propia -- hasta
-- ahora TARIFA (tarifa unica: LOCADOR MENSUAL/POR_JORNADA/POR_PROYECTO)
-- y TARIFA_HORA (LOCADOR POR_HORA, una fila por proyecto enlazado)
-- asumian implicitamente soles, sin forma de declarar otra moneda ni de
-- convertir al costeo de un proyecto en dolares -- un locador cobrando
-- en soles en un proyecto en dolares se sumaba tal cual, como si ya
-- fuera dolares.
--
-- RRHH_CONTRATO.ID_MONEDA/TIPO_CAMBIO cubre TARIFA (tarifa unica: un
-- solo proyecto por contrato via RRHH_CONTRATO.ID_PROYECTO, asi que la
-- moneda vive junto a la tarifa en la misma fila). NULL para PLANILLA
-- (no tiene TARIFA).
--
-- RRHH_CONTRATO_PROYECTO.ID_MONEDA/TIPO_CAMBIO cubre TARIFA_HORA --
-- independiente por cada proyecto enlazado (a diferencia de tarifa
-- unica, un locador por hora puede facturarle a varios proyectos, cada
-- uno en su propia moneda). NOT NULL: toda fila de esta tabla tiene
-- TARIFA_HORA, siempre necesita una moneda.
--
-- Backfill a soles para las filas existentes -- mismo criterio que
-- 023_proyecto_mano_obra_estructurada.sql/033_ingreso_moneda.sql.
-- TIPO_CAMBIO se agrega vacio (nadie tiene TC que migrar).
-- =====================================================================

SET @id_pen = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'MONEDA' AND CODIGO = 'PEN' LIMIT 1);

ALTER TABLE RRHH_CONTRATO ADD COLUMN ID_MONEDA INT UNSIGNED NULL AFTER TARIFA;
UPDATE RRHH_CONTRATO SET ID_MONEDA = @id_pen WHERE ID_MONEDA IS NULL AND TARIFA IS NOT NULL;
ALTER TABLE RRHH_CONTRATO ADD CONSTRAINT FK_RRHH_CONTRATO_MONEDA FOREIGN KEY (ID_MONEDA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO);
ALTER TABLE RRHH_CONTRATO ADD COLUMN TIPO_CAMBIO DECIMAL(10,4) NULL AFTER ID_MONEDA;

ALTER TABLE RRHH_CONTRATO_PROYECTO ADD COLUMN ID_MONEDA INT UNSIGNED NULL AFTER TARIFA_HORA;
UPDATE RRHH_CONTRATO_PROYECTO SET ID_MONEDA = @id_pen WHERE ID_MONEDA IS NULL;
ALTER TABLE RRHH_CONTRATO_PROYECTO MODIFY COLUMN ID_MONEDA INT UNSIGNED NOT NULL;
ALTER TABLE RRHH_CONTRATO_PROYECTO ADD CONSTRAINT FK_RRHH_CONTRATO_PROYECTO_MONEDA FOREIGN KEY (ID_MONEDA) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO);
ALTER TABLE RRHH_CONTRATO_PROYECTO ADD COLUMN TIPO_CAMBIO DECIMAL(10,4) NULL AFTER ID_MONEDA;
