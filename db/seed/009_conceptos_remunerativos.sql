-- =====================================================================
-- Catalogo de conceptos remunerativos para contratos de planilla.
-- RRHH puede agregar mas desde /administracion/maestros (tipo
-- CONCEPTO_REMUNERATIVO) sin tocar codigo.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('CONCEPTO_REMUNERATIVO', 'INGRESO_BASE', 'Ingreso base', 1, @id_activo),
    ('CONCEPTO_REMUNERATIVO', 'BONO', 'Bono', 2, @id_activo),
    ('CONCEPTO_REMUNERATIVO', 'TRANSPORTE', 'Movilidad / transporte', 3, @id_activo),
    ('CONCEPTO_REMUNERATIVO', 'BONIFICACION_FAMILIAR', 'Bonificacion familiar', 4, @id_activo);
