-- =====================================================================
-- Registra la aplicacion "Compras" (proveedores, compras y pagos a
-- proveedores/contratos) bajo el area FACTURACION, independiente de
-- Pasivos. SUPER_ADMIN ya recibe ADMIN automaticamente al crearse la
-- aplicacion (ver SP_APLICACION_CREAR).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'COMPRAS_EMPRESA', 'Compras',
    'Proveedores, compras y pagos a proveedores y a contratos (haberes/honorarios) de la empresa',
    'shopping-cart', @id_tipo_modulo, '/facturacion/compras', NULL,
    @id_area_facturacion, 0, @id_aplicacion_compras
);

SET @id_app_compras = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'COMPRAS_EMPRESA');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_compras, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_compras, @id_nivel_escritura);
