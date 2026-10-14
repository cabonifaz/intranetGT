-- =====================================================================
-- Catalogo de estados de PROYECTO_CONFORMIDAD (ver 050_proyecto_conformidad.sql).
--   BORRADOR: items editables, todavia no se genero el PDF.
--   EMITIDA:  PDF generado, items congelados, lista para que el cliente firme.
--   FIRMADA:  el cliente ya firmo (por el link publico o subida manual).
--   ANULADA:  descartada (nunca desde FIRMADA, es respaldo legal de facturacion).
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('ESTADO_CONFORMIDAD', 'BORRADOR', 'Borrador (editando items)', 1, @id_activo),
    ('ESTADO_CONFORMIDAD', 'EMITIDA', 'Emitida (pendiente de firma)', 2, @id_activo),
    ('ESTADO_CONFORMIDAD', 'FIRMADA', 'Firmada', 3, @id_activo),
    ('ESTADO_CONFORMIDAD', 'ANULADA', 'Anulada', 4, @id_activo);
