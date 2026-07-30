-- =====================================================================
-- El "proyecto" de un contrato LOCADOR (tarifa unica o por hora) ahora
-- se elige entre los PROYECTO/SERVICIO existentes -- ya no es texto
-- libre. Sin backfill: filas ya creadas sin proyecto quedan huerfanas
-- (nombre en blanco) hasta que se recreen -- son contratos de prueba.
-- =====================================================================

-- RRHH_CONTRATO_PROYECTO.ID_PROYECTO ya existe (018_proyectos.sql),
-- pasa a ser la unica fuente del nombre (antes convivia con texto libre).
ALTER TABLE RRHH_CONTRATO_PROYECTO
    DROP COLUMN NOMBRE_PROYECTO;

-- LOCADOR de tarifa unica (MENSUAL/POR_JORNADA/POR_PROYECTO): reemplaza
-- el texto libre NOMBRE_PROYECTO por un enlace real.
ALTER TABLE RRHH_CONTRATO
    ADD COLUMN ID_PROYECTO INT UNSIGNED NULL AFTER TARIFA;

ALTER TABLE RRHH_CONTRATO
    ADD CONSTRAINT FK_RRHH_CONTRATO_PROYECTO FOREIGN KEY (ID_PROYECTO) REFERENCES PROYECTO (ID_PROYECTO);

CREATE INDEX IX_RRHH_CONTRATO_PROYECTO ON RRHH_CONTRATO (ID_PROYECTO);

ALTER TABLE RRHH_CONTRATO
    DROP COLUMN NOMBRE_PROYECTO;
