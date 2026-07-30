-- =====================================================================
-- Catalogos del modulo de pasivos: tipo de pasivo, estado del pasivo
-- (nivel cabecera) y estado de cada cuota (nivel detalle). No se guarda
-- un estado "VENCIDA" -- se calcula en la app comparando FECHA_VENCIMIENTO
-- contra hoy, igual que "por vencer" en RRHH_CONTRATO.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_PASIVO', 'PRESTAMO', 'Prestamo', 1, @id_activo),
    ('TIPO_PASIVO', 'LINEA_CREDITO', 'Linea de credito', 2, @id_activo),
    ('TIPO_PASIVO', 'DEUDA_PROVEEDOR', 'Deuda con proveedor', 3, @id_activo),
    ('TIPO_PASIVO', 'OTRO', 'Otro', 4, @id_activo),

    ('ESTADO_PASIVO', 'ACTIVO', 'Activo', 1, @id_activo),
    ('ESTADO_PASIVO', 'CANCELADO', 'Cancelado', 2, @id_activo),
    ('ESTADO_PASIVO', 'ANULADO', 'Anulado', 3, @id_activo),

    ('ESTADO_CUOTA', 'PENDIENTE', 'Pendiente', 1, @id_activo),
    ('ESTADO_CUOTA', 'PAGADA', 'Pagada', 2, @id_activo),
    ('ESTADO_CUOTA', 'PROTESTADA', 'Protestada', 3, @id_activo),
    ('ESTADO_CUOTA', 'ANULADA', 'Anulada', 4, @id_activo);
