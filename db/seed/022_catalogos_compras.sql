-- =====================================================================
-- Catalogo del modulo de compras: estado de la compra (soporta pagos
-- parciales -- PARCIAL cuando la suma de COMPRA_PAGO es menor al
-- MONTO_TOTAL, PAGADA cuando lo iguala o supera).
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('ESTADO_COMPRA', 'PENDIENTE_PAGO', 'Pendiente de pago', 1, @id_activo),
    ('ESTADO_COMPRA', 'PARCIAL', 'Pago parcial', 2, @id_activo),
    ('ESTADO_COMPRA', 'PAGADA', 'Pagada', 3, @id_activo),
    ('ESTADO_COMPRA', 'ANULADA', 'Anulada', 4, @id_activo);
