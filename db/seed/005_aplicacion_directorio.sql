-- =====================================================================
-- Registra el modulo "Directorio Corporativo" y otorga permisos con
-- distinto nivel segun el rol -- demuestra el RBAC pedido originalmente
-- ("cada app variara segun el nivel de privilegios del rol"). No es solo
-- de empleados: a futuro tambien alojara proveedores/socios comerciales
-- (ver plan), por eso el nombre generico.
-- Requiere sp_aplicacion.sql y sp_permiso.sql ya aplicados.
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_rrhh = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'RRHH');

CALL SP_APLICACION_CREAR(
    'RRHH_DIRECTORIO',
    'Directorio Corporativo',
    'Contacto y datos de las personas de la empresa',
    'users',
    @id_tipo_modulo,
    '/rrhh/directorio',
    NULL,
    @id_area_rrhh,
    0,
    @id_aplicacion_directorio
);

SET @id_app_directorio = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'RRHH_DIRECTORIO');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');
SET @id_nivel_lectura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'LECTURA');

-- RRHH administra el directorio (Jefatura = ADMIN, Asistente = ESCRITURA).
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'RRHH_JEFATURA'), @id_app_directorio, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'RRHH_ASISTENTE'), @id_app_directorio, @id_nivel_escritura);

-- El resto de areas solo puede consultarlo (es un directorio de contactos).
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'ADMINISTRACION_JEFATURA'), @id_app_directorio, @id_nivel_lectura);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'ADMINISTRACION_ASISTENTE'), @id_app_directorio, @id_nivel_lectura);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_directorio, @id_nivel_lectura);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_directorio, @id_nivel_lectura);
