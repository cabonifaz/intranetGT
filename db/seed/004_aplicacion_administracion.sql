-- =====================================================================
-- Registra el modulo interno "Administracion" (usuarios/roles/aplicaciones/
-- maestros/permisos) como una APLICACION mas. SP_APLICACION_CREAR le
-- otorga ADMIN a SUPER_ADMIN automaticamente sobre ella.
-- Requiere que db/procedures/sp_aplicacion.sql ya este aplicado.
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_super = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'SUPER');

CALL SP_APLICACION_CREAR(
    'ADMINISTRACION',
    'Administracion',
    'Gestion de usuarios, roles, aplicaciones, maestros y permisos de la intranet',
    'settings',
    @id_tipo_modulo,
    '/administracion',
    NULL,
    @id_area_super,
    0,
    @id_aplicacion_administracion
);
