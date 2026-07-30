-- =====================================================================
-- Registra el modulo "Contratos" y otorga permisos. A diferencia del
-- directorio, esto incluye datos bancarios/remuneracion -- NO es
-- LECTURA para el resto de areas, solo RRHH (y SUPER_ADMIN via el
-- auto-grant de SP_APLICACION_CREAR).
-- Requiere sp_aplicacion.sql y sp_permiso.sql ya aplicados.
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_rrhh = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'RRHH');

CALL SP_APLICACION_CREAR(
    'RRHH_CONTRATOS',
    'Contratos',
    'Contratacion, contratos de planilla y locadores, vencimientos y firma digital',
    'file-text',
    @id_tipo_modulo,
    '/rrhh/contratos',
    NULL,
    @id_area_rrhh,
    0,
    @id_aplicacion_contratos
);

SET @id_app_contratos = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'RRHH_CONTRATOS');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'RRHH_JEFATURA'), @id_app_contratos, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'RRHH_ASISTENTE'), @id_app_contratos, @id_nivel_escritura);
