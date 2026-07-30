-- =====================================================================
-- Registra la aplicacion "Tipo de Cambio" bajo el area FACTURACION --
-- pantalla para fijar el TC vigente de cada categoria (laboral/prestamo/
-- compra/venta) y ver su historico, mas el TC oficial SUNAT del dia como
-- referencia.
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'TIPO_CAMBIO', 'Tipo de Cambio',
    'TC vigente por categoria (laboral, prestamos, compras, ventas) usado para convertir montos en otra moneda al costeo de un proyecto',
    'currency-exchange', @id_tipo_modulo, '/facturacion/tipo-cambio', NULL,
    @id_area_facturacion, 0, @id_aplicacion_tipo_cambio
);

SET @id_app_tipo_cambio = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'TIPO_CAMBIO');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_tipo_cambio, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_tipo_cambio, @id_nivel_escritura);
