-- =====================================================================
-- Catalogos del modulo de cuentas: tipo de cuenta, moneda, tipo de
-- movimiento. El catalogo de bancos se reutiliza del ya sembrado en
-- 012_catalogo_bancos.sql (TIPO_MAESTRO='BANCO').
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('TIPO_CUENTA', 'BANCARIA', 'Cuenta bancaria', 1, @id_activo),
    ('TIPO_CUENTA', 'DETRACCIONES', 'Cuenta de detracciones', 2, @id_activo),
    ('TIPO_CUENTA', 'IGV_FAVOR', 'IGV a favor', 3, @id_activo),
    ('TIPO_CUENTA', 'RENTA_FAVOR', 'Renta a favor', 4, @id_activo),

    ('MONEDA', 'PEN', 'Soles (S/)', 1, @id_activo),
    ('MONEDA', 'USD', 'Dolares (US$)', 2, @id_activo),

    ('TIPO_MOVIMIENTO_CUENTA', 'INGRESO', 'Ingreso', 1, @id_activo),
    ('TIPO_MOVIMIENTO_CUENTA', 'EGRESO', 'Egreso', 2, @id_activo);
