-- =====================================================================
-- Catalogo de bancos operando en Peru, para el combo con busqueda de la
-- cuenta de pago en /contratos/firmar/[token] (RRHH_CONTRATO.BANCO sigue
-- siendo texto libre, este catalogo solo alimenta el selector). RRHH puede
-- agregar mas desde /administracion/maestros (tipo BANCO).
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('BANCO', 'BCP', 'Banco de Credito del Peru (BCP)', 1, @id_activo),
    ('BANCO', 'BBVA', 'BBVA Peru', 2, @id_activo),
    ('BANCO', 'INTERBANK', 'Interbank', 3, @id_activo),
    ('BANCO', 'SCOTIABANK', 'Scotiabank Peru', 4, @id_activo),
    ('BANCO', 'BANCO_NACION', 'Banco de la Nacion', 5, @id_activo),
    ('BANCO', 'BANBIF', 'BanBif', 6, @id_activo),
    ('BANCO', 'MIBANCO', 'Mibanco', 7, @id_activo),
    ('BANCO', 'PICHINCHA', 'Banco Pichincha', 8, @id_activo),
    ('BANCO', 'GNB', 'Banco GNB', 9, @id_activo),
    ('BANCO', 'FALABELLA', 'Banco Falabella', 10, @id_activo),
    ('BANCO', 'RIPLEY', 'Banco Ripley', 11, @id_activo),
    ('BANCO', 'SANTANDER', 'Banco Santander Peru', 12, @id_activo),
    ('BANCO', 'CITIBANK', 'Citibank Peru', 13, @id_activo),
    ('BANCO', 'COMPARTAMOS', 'Compartamos Banco', 14, @id_activo),
    ('BANCO', 'ALFIN', 'Alfin Banco', 15, @id_activo);
