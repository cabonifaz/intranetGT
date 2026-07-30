-- =====================================================================
-- Catalogos del modulo de contratos: tipo de contrato, tipo de pago para
-- locadores, y estados del ciclo de vida del contrato.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_CONTRATO', 'PLANILLA_FULLTIME', 'Planilla - Tiempo completo', 1, @id_activo),
    ('TIPO_CONTRATO', 'PLANILLA_PARTTIME', 'Planilla - Tiempo parcial', 2, @id_activo),
    ('TIPO_CONTRATO', 'LOCADOR', 'Locador de servicios', 3, @id_activo),

    ('TIPO_PAGO_LOCADOR', 'POR_HORA', 'Pago por hora', 1, @id_activo),
    ('TIPO_PAGO_LOCADOR', 'MENSUAL', 'Pago mensual', 2, @id_activo),
    ('TIPO_PAGO_LOCADOR', 'POR_JORNADA', 'Pago por jornada diaria', 3, @id_activo),

    ('ESTADO_CONTRATO', 'BORRADOR', 'Borrador (sin enviar)', 1, @id_activo),
    ('ESTADO_CONTRATO', 'PENDIENTE_FIRMA', 'Link enviado, esperando firma', 2, @id_activo),
    ('ESTADO_CONTRATO', 'FIRMADO', 'Firmado', 3, @id_activo),
    ('ESTADO_CONTRATO', 'VENCIDO', 'Vencido', 4, @id_activo),
    ('ESTADO_CONTRATO', 'RENOVADO', 'Renovado (reemplazado por uno nuevo)', 5, @id_activo),
    ('ESTADO_CONTRATO', 'ANULADO', 'Anulado', 6, @id_activo);
