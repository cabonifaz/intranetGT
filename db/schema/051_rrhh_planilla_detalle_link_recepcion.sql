-- =====================================================================
-- Link publico con token para que el colaborador confirme la recepcion
-- de su boleta SIN tener que iniciar sesion en el intranet -- mismo
-- mecanismo que RRHH_PRESTAMO/RRHH_CONTRATO (ver 045_rrhh_prestamo_firma_digital.sql):
-- columnas de token en la propia tabla, token de un solo uso (se limpia
-- al confirmar). Sigue existiendo la confirmacion dentro del intranet
-- (confirmarRecepcionBoletaAction, con sesion) para quien ya esta
-- logueado -- este link es la alternativa para compartir por fuera
-- (WhatsApp, correo) a quien no entra seguido al intranet.
-- =====================================================================

ALTER TABLE RRHH_PLANILLA_DETALLE
    ADD COLUMN TOKEN_FIRMA CHAR(36) NULL AFTER FECHA_CONFIRMACION_COLABORADOR,
    ADD COLUMN TOKEN_EXPIRA DATETIME NULL AFTER TOKEN_FIRMA,
    ADD CONSTRAINT UQ_PLANILLA_DETALLE_TOKEN UNIQUE (TOKEN_FIRMA);
