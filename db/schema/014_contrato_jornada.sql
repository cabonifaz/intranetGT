-- =====================================================================
-- 014_contrato_jornada.sql
-- Dias/horario de trabajo pactados, especificos de cada contrato de
-- planilla (no aplica a locadores, que no tienen jornada por ley -- no
-- hay subordinacion). NOTA_JORNADA es un texto libre opcional para
-- observaciones puntuales (ej. ajustes de horas para cumplir un tope legal).
-- =====================================================================

ALTER TABLE RRHH_CONTRATO
    ADD COLUMN DIAS_LABORALES VARCHAR(100) NULL AFTER FECHA_FIN,
    ADD COLUMN HORA_INICIO TIME NULL AFTER DIAS_LABORALES,
    ADD COLUMN HORA_FIN TIME NULL AFTER HORA_INICIO,
    ADD COLUMN NOTA_JORNADA VARCHAR(300) NULL AFTER HORA_FIN;
