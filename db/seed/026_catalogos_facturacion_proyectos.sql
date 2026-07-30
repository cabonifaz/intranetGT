-- =====================================================================
-- Catalogos del plan de facturacion de proyectos: tipo de item y estado.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_HITO_FACTURACION', 'ADELANTO', 'Adelanto', 1, @id_activo),
    ('TIPO_HITO_FACTURACION', 'HITO', 'Hito', 2, @id_activo),
    ('TIPO_HITO_FACTURACION', 'FACTURA_FINAL', 'Factura final', 3, @id_activo),
    ('TIPO_HITO_FACTURACION', 'VARIABLE', 'Facturacion variable', 4, @id_activo),

    ('ESTADO_HITO_FACTURACION', 'PLANEADO', 'Planeado', 1, @id_activo),
    ('ESTADO_HITO_FACTURACION', 'FACTURADO', 'Facturado', 2, @id_activo),
    ('ESTADO_HITO_FACTURACION', 'COBRADO', 'Cobrado', 3, @id_activo),
    ('ESTADO_HITO_FACTURACION', 'ANULADO', 'Anulado', 4, @id_activo);
