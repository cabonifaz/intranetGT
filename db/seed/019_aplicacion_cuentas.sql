-- =====================================================================
-- Registra la aplicacion "Cuentas" (control de cuentas de la empresa)
-- bajo el area FACTURACION, y le da permiso a sus roles. SUPER_ADMIN ya
-- recibe ADMIN automaticamente al crearse la aplicacion (ver
-- SP_APLICACION_CREAR).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'CUENTAS_EMPRESA', 'Cuentas',
    'Control de las cuentas de la empresa (soles, dolares y detracciones por banco) y de saldos a favor de IGV/Renta',
    'wallet', @id_tipo_modulo, '/facturacion/cuentas', NULL,
    @id_area_facturacion, 0, @id_aplicacion_cuentas
);

SET @id_app_cuentas = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'CUENTAS_EMPRESA');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_cuentas, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_cuentas, @id_nivel_escritura);
