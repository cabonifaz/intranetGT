-- =====================================================================
-- Nuevo tipo de pago para locadores: monto fijo total ligado a un
-- proyecto/entregable (distinto de POR_HORA -- via tareo -- y de MENSUAL/
-- POR_JORNADA -- montos recurrentes). Reutiliza TARIFA + NOMBRE_PROYECTO
-- de RRHH_CONTRATO, igual que MENSUAL/POR_JORNADA.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_PAGO_LOCADOR', 'POR_PROYECTO', 'Por proyecto (monto fijo)', 4, @id_activo);
