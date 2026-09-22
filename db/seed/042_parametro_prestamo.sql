-- =====================================================================
-- Parametros de Prestamos administrados como maestro (en vez de vivir
-- hardcodeados en el codigo) -- CODIGO identifica el parametro,
-- DESCRIPCION guarda su valor como texto. Por ahora solo el % maximo que
-- se puede solicitar como adelanto de sueldo sobre el sueldo fijo del
-- beneficiario (ver SP_RRHH_PRESTAMO_CREAR/SOLICITAR y
-- SP_RRHH_CONTRATO_SUELDO_FIJO_VIGENTE). DESCRIPCION='70' significa 70%.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('PARAMETRO_PRESTAMO', 'PORCENTAJE_MAXIMO_ADELANTO', '70', 1, @id_activo);
