-- =====================================================================
-- Catalogo del tipo de relacion de un contacto externo del directorio.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_RELACION_CONTACTO', 'CLIENTE', 'Cliente', 1, @id_activo),
    ('TIPO_RELACION_CONTACTO', 'PROVEEDOR', 'Proveedor', 2, @id_activo),
    ('TIPO_RELACION_CONTACTO', 'SOCIO_COMERCIAL', 'Socio comercial', 3, @id_activo),
    ('TIPO_RELACION_CONTACTO', 'OTRO', 'Otro', 4, @id_activo);
