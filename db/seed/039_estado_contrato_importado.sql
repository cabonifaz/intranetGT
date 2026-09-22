-- =====================================================================
-- Estado extra de RRHH_CONTRATO para el flujo de importacion (ver
-- 042_rrhh_contrato_importacion.sql): un contrato recien importado nace
-- aca, con los datos que pudo leer la OCR -- todavia no cuenta como
-- FIRMADO (no aplica a planilla, no aparece como vigente) hasta que se
-- revisa y confirma.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('ESTADO_CONTRATO', 'IMPORTADO_EN_REVISION', 'Importado -- en revision', 7, @id_activo);
