-- =====================================================================
-- Puesto y fecha de ingreso dejan de ser texto libre editable en la
-- ficha del colaborador: puesto pasa a ser el nombre de su rol principal
-- (ROL.NOMBRE via USUARIO_ROL.ES_PRINCIPAL=1, ya calculado como
-- ROL_NOMBRE), y fecha de ingreso pasa a ser la fecha de inicio de su
-- contrato mas antiguo (MIN(RRHH_CONTRATO.FECHA_INICIO)). Ambos se
-- calculan en sp_rrhh_empleado.sql, ya no hay columna que guardarlos.
-- Sin backfill -- se recalculan solos desde datos que ya existen.
-- =====================================================================

ALTER TABLE RRHH_EMPLEADO DROP COLUMN PUESTO;
ALTER TABLE RRHH_EMPLEADO DROP COLUMN FECHA_INGRESO;
