-- =====================================================================
-- Registra el modulo "Planilla" y otorga permisos. Igual que Contratos,
-- maneja datos de sueldo/bancarios/tributarios -- NO es LECTURA para el
-- resto de areas, solo RRHH (y SUPER_ADMIN via el auto-grant de
-- SP_APLICACION_CREAR). Requiere sp_aplicacion.sql y sp_permiso.sql ya
-- aplicados, y que RRHH_JEFATURA/RRHH_ASISTENTE ya existan (003).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_rrhh = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'RRHH');

CALL SP_APLICACION_CREAR(
    'RRHH_PLANILLA',
    'Planilla',
    'Planilla mensual de todos los colaboradores -- calculo de AFP/ONP/EsSalud/Renta, boletas de pago y recibos por honorarios',
    'wallet',
    @id_tipo_modulo,
    '/rrhh/planilla',
    NULL,
    @id_area_rrhh,
    0,
    @id_aplicacion_planilla
);

SET @id_app_planilla = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'RRHH_PLANILLA');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'RRHH_JEFATURA'), @id_app_planilla, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'RRHH_ASISTENTE'), @id_app_planilla, @id_nivel_escritura);
