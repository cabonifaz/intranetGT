-- =====================================================================
-- Registra la aplicacion "Cuentas por Pagar" bajo el area FACTURACION --
-- vista consolidada de todo lo pendiente de pagar (compras, sueldos/
-- honorarios de RRHH, mano de obra de proyectos, cuotas de pasivos).
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'CUENTAS_POR_PAGAR', 'Cuentas por Pagar',
    'Vista consolidada de todo lo pendiente de pagar: compras, sueldos/honorarios, mano de obra y cuotas de pasivos',
    'wallet', @id_tipo_modulo, '/facturacion/cuentas-por-pagar', NULL,
    @id_area_facturacion, 0, @id_aplicacion_cuentas_por_pagar
);

SET @id_app_cuentas_por_pagar = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'CUENTAS_POR_PAGAR');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_cuentas_por_pagar, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_cuentas_por_pagar, @id_nivel_escritura);
