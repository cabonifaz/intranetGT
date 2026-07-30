-- =====================================================================
-- Registra la aplicacion "Proyectos" (costeo y margen de proyectos y
-- servicios) bajo el area FACTURACION, independiente de Cuentas/
-- Pasivos/Compras. SUPER_ADMIN ya recibe ADMIN automaticamente al
-- crearse la aplicacion (ver SP_APLICACION_CREAR).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'PROYECTOS_EMPRESA', 'Proyectos',
    'Costeo y margen de proyectos y servicios: mano de obra, compras e ingresos',
    'bar-chart', @id_tipo_modulo, '/facturacion/proyectos', NULL,
    @id_area_facturacion, 0, @id_aplicacion_proyectos
);

SET @id_app_proyectos = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'PROYECTOS_EMPRESA');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_proyectos, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_proyectos, @id_nivel_escritura);
