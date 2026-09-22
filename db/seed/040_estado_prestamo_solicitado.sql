-- =====================================================================
-- Estado extra de RRHH_PRESTAMO para el autoservicio: cualquier
-- colaborador puede "solicitar" un prestamo o adelanto (SP_RRHH_PRESTAMO_SOLICITAR,
-- sin cronograma ni cuenta de desembolso todavia), y RRHH lo revisa y
-- "otorga" (SP_RRHH_PRESTAMO_OTORGAR) recien ahi arma el cronograma y
-- pasa a PENDIENTE_FIRMA -- el resto del flujo (compromiso, firma) sigue
-- igual que un prestamo creado directo por RRHH.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('ESTADO_PRESTAMO', 'SOLICITADO', 'Solicitado -- pendiente de otorgar', 0, @id_activo);
