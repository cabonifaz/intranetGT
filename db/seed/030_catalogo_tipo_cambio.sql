-- =====================================================================
-- Categorias de tipo de cambio (TC) -- cada una se fija a mano por
-- separado, no se derivan del TC compra/venta oficial de SUNAT (que solo
-- se muestra como referencia). Ver 032_tipo_cambio_categorias.sql.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('CATEGORIA_TIPO_CAMBIO', 'LABORAL', 'Costos laborales', 1, @id_activo),
    ('CATEGORIA_TIPO_CAMBIO', 'PRESTAMO', 'Prestamos', 2, @id_activo),
    ('CATEGORIA_TIPO_CAMBIO', 'COMPRA', 'Compras', 3, @id_activo),
    ('CATEGORIA_TIPO_CAMBIO', 'VENTA', 'Ventas / Ingresos', 4, @id_activo);
