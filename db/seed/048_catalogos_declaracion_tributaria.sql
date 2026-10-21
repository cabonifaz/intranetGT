-- =====================================================================
-- Catalogos del modulo de impuestos -- mismo patron que 026_catalogos_facturacion_proyectos.sql.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_DECLARACION_TRIBUTARIA', 'IGV_RENTA_MENSUAL', 'IGV + Renta mensual (PDT 621)', 1, @id_activo),
    ('TIPO_DECLARACION_TRIBUTARIA', 'DJ_ANUAL_RENTA', 'Declaracion Jurada Anual de Renta', 2, @id_activo),

    ('ESTADO_DECLARACION_TRIBUTARIA', 'BORRADOR', 'Borrador', 1, @id_activo),
    ('ESTADO_DECLARACION_TRIBUTARIA', 'PRESENTADA', 'Presentada', 2, @id_activo),
    ('ESTADO_DECLARACION_TRIBUTARIA', 'PAGADA', 'Pagada', 3, @id_activo),
    ('ESTADO_DECLARACION_TRIBUTARIA', 'ANULADA', 'Anulada', 4, @id_activo);
