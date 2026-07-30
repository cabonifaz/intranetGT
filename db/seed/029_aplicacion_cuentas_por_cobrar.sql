-- =====================================================================
-- Registra la aplicacion "Cuentas por Cobrar" bajo el area FACTURACION --
-- vista consolidada de los items del plan de facturacion de todos los
-- proyectos que aun no se cobraron (PLANEADO/FACTURADO).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'CUENTAS_POR_COBRAR', 'Cuentas por Cobrar',
    'Vista consolidada de los items del plan de facturacion de todos los proyectos que aun no se cobraron',
    'inbox', @id_tipo_modulo, '/facturacion/cuentas-por-cobrar', NULL,
    @id_area_facturacion, 0, @id_aplicacion_cuentas_por_cobrar
);

SET @id_app_cuentas_por_cobrar = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'CUENTAS_POR_COBRAR');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_cuentas_por_cobrar, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_cuentas_por_cobrar, @id_nivel_escritura);
