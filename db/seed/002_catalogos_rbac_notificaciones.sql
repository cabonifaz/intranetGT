-- =====================================================================
-- Catalogos nuevos de Fase 2: tipo de aplicacion, nivel de permiso
-- (el ORDEN es la jerarquia usada para "maximo privilegio entre roles")
-- y categorias de notificacion.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_APLICACION', 'MODULO_INTERNO', 'Modulo dentro del mismo monolito', 1, @id_activo),
    ('TIPO_APLICACION', 'APP_EXTERNA', 'Aplicacion externa via SSO', 2, @id_activo),

    ('NIVEL_PERMISO', 'SIN_ACCESO', 'Sin acceso', 0, @id_activo),
    ('NIVEL_PERMISO', 'LECTURA', 'Solo lectura', 1, @id_activo),
    ('NIVEL_PERMISO', 'ESCRITURA', 'Lectura y escritura', 2, @id_activo),
    ('NIVEL_PERMISO', 'ADMIN', 'Administracion del modulo', 3, @id_activo),

    ('CATEGORIA_NOTIFICACION', 'SISTEMA', 'Avisos generales de la intranet', 1, @id_activo),
    ('CATEGORIA_NOTIFICACION', 'SEGURIDAD', 'Alertas de seguridad de la cuenta', 2, @id_activo),
    ('CATEGORIA_NOTIFICACION', 'MODULO', 'Generada por un modulo/aplicacion', 3, @id_activo);
