-- =====================================================================
-- Registra la aplicacion "Impuestos" (declaraciones mensuales de IGV/
-- Renta y DJ anual) bajo el area FACTURACION -- mismo patron que
-- 019_aplicacion_cuentas.sql. SUPER_ADMIN ya recibe ADMIN automatico al
-- crearse la aplicacion (ver SP_APLICACION_CREAR).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'IMPUESTOS_EMPRESA', 'Impuestos',
    'Declaraciones mensuales de IGV/Renta (PDT 621) y Declaracion Jurada Anual de Renta',
    'landmark', @id_tipo_modulo, '/facturacion/impuestos', NULL,
    @id_area_facturacion, 0, @id_aplicacion_impuestos
);

SET @id_app_impuestos = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'IMPUESTOS_EMPRESA');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_impuestos, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_impuestos, @id_nivel_escritura);
