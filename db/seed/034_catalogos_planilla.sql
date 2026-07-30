-- =====================================================================
-- Catalogos del modulo de Planilla Mensual: sistema de pension, fondo
-- AFP, y los dos estados propios (de la corrida mensual y de cada
-- detalle por colaborador -- cada uno con su propio TIPO_MAESTRO, mismo
-- criterio que ESTADO_COMPRA/ESTADO_PASIVO/etc, no se reusa ESTADO_GENERAL
-- para estados de flujo especificos del modulo).
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('SISTEMA_PENSION', 'AFP', 'Sistema Privado de Pensiones (AFP)', 1, @id_activo),
    ('SISTEMA_PENSION', 'ONP', 'Sistema Nacional de Pensiones (ONP)', 2, @id_activo),

    ('AFP_FONDO', 'INTEGRA', 'AFP Integra', 1, @id_activo),
    ('AFP_FONDO', 'PRIMA', 'AFP Prima', 2, @id_activo),
    ('AFP_FONDO', 'PROFUTURO', 'AFP Profuturo', 3, @id_activo),
    ('AFP_FONDO', 'HABITAT', 'AFP Habitat', 4, @id_activo),

    ('ESTADO_PLANILLA_MENSUAL', 'BORRADOR', 'Borrador (editable)', 1, @id_activo),
    ('ESTADO_PLANILLA_MENSUAL', 'EMITIDA', 'Emitida', 2, @id_activo),

    ('ESTADO_EMISION_PLANILLA_DETALLE', 'PENDIENTE', 'Pendiente de emision', 1, @id_activo),
    ('ESTADO_EMISION_PLANILLA_DETALLE', 'EMITIDA', 'Emitida', 2, @id_activo);
