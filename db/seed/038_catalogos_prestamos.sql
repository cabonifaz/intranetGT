-- =====================================================================
-- Catalogos de Prestamos a colaboradores. Cada uno con su propio
-- TIPO_MAESTRO (mismo criterio que ESTADO_PLANILLA_MENSUAL/ESTADO_PASIVO).
--   PENDIENTE_FIRMA: prestamo registrado, compromiso aun sin firmar --
--                    todavia no se descuenta en planilla.
--   ACTIVO:          compromiso firmado y subido -- sus cuotas se
--                    descuentan en la planilla del mes que les toca.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_PRESTAMO', 'PRESTAMO', 'Prestamo', 1, @id_activo),
    ('TIPO_PRESTAMO', 'ADELANTO_SUELDO', 'Adelanto de sueldo', 2, @id_activo),

    ('ESTADO_PRESTAMO', 'PENDIENTE_FIRMA', 'Pendiente de firma del compromiso', 1, @id_activo),
    ('ESTADO_PRESTAMO', 'ACTIVO', 'Activo (compromiso firmado)', 2, @id_activo),
    ('ESTADO_PRESTAMO', 'ANULADO', 'Anulado', 3, @id_activo),

    ('ESTADO_CUOTA_PRESTAMO', 'PENDIENTE', 'Pendiente de descuento', 1, @id_activo),
    ('ESTADO_CUOTA_PRESTAMO', 'DESCONTADA', 'Descontada en planilla', 2, @id_activo),
    ('ESTADO_CUOTA_PRESTAMO', 'ANULADA', 'Anulada', 3, @id_activo);
