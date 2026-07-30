-- =====================================================================
-- Catalogos del modulo de proyectos: tipo (proyecto de pago unico vs
-- servicio recurrente -- misma mecanica de costeo para ambos) y estado.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_PROYECTO', 'PROYECTO', 'Proyecto', 1, @id_activo),
    ('TIPO_PROYECTO', 'SERVICIO', 'Servicio', 2, @id_activo),

    ('ESTADO_PROYECTO', 'EN_CURSO', 'En curso', 1, @id_activo),
    ('ESTADO_PROYECTO', 'CERRADO', 'Cerrado', 2, @id_activo),
    ('ESTADO_PROYECTO', 'ANULADO', 'Anulado', 3, @id_activo);
