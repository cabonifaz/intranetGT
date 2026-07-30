-- =====================================================================
-- Registra la aplicacion "Pagos Recurrentes" bajo el area FACTURACION --
-- cronograma de gastos que se repiten periodo tras periodo (alquiler,
-- internet, software, seguros...), ver 035_pagos_recurrentes.sql.
-- =====================================================================

SET @id_tipo_modulo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_APLICACION' AND CODIGO = 'MODULO_INTERNO');
SET @id_area_facturacion = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'FACTURACION');

CALL SP_APLICACION_CREAR(
    'PAGOS_RECURRENTES', 'Pagos Recurrentes',
    'Cronograma de gastos recurrentes (alquiler, internet, software, seguros...) con generacion de instancias e instancias por pagar',
    'repeat', @id_tipo_modulo, '/facturacion/pagos-recurrentes', NULL,
    @id_area_facturacion, 0, @id_aplicacion_pagos_recurrentes
);

SET @id_app_pagos_recurrentes = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'PAGOS_RECURRENTES');
SET @id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_JEFATURA'), @id_app_pagos_recurrentes, @id_nivel_admin);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR((SELECT ID_ROL FROM ROL WHERE CODIGO = 'FACTURACION_ASISTENTE'), @id_app_pagos_recurrentes, @id_nivel_escritura);
