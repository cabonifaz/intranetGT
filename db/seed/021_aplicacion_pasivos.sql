-- =====================================================================
-- Registra la aplicacion "Pasivos" (deudas, prestamos, plan de pagos)
-- bajo el area FACTURACION, como app independiente de Cuentas y de
-- Compras (mismo criterio que RRHH_DIRECTORIO/RRHH_CONTRATOS: un area
-- puede alojar varias apps con permisos separados). SUPER_ADMIN ya
-- recibe ADMIN automaticamente al crearse la aplicacion (ver
-- SP_APLICACION_CREAR).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'PASIVOS_EMPRESA', 'Pasivos',
    'Deudas, prestamos, lineas de credito y letras protestadas de la empresa, con su plan de pagos',
    'trending-down', @id_tipo_modulo, '/facturacion/pasivos', NULL,
    @id_area_facturacion, 0, @id_aplicacion_pasivos
);

SET @id_app_pasivos = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'PASIVOS_EMPRESA');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_pasivos, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_pasivos, @id_nivel_escritura);
