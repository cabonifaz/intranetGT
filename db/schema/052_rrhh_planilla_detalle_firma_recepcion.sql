-- =====================================================================
-- La confirmacion de recepcion de la boleta (en el intranet o por el
-- link publico con token, ver 051_rrhh_planilla_detalle_link_recepcion.sql)
-- ahora pide tambien la firma del colaborador como aceptacion -- mismo
-- mecanismo que RxH/Prestamos/Contratos/Conformidad: dibujada o subida
-- (ver FirmaInput.tsx), guardada como PNG aparte del acuse de recibo
-- (FECHA_CONFIRMACION_COLABORADOR).
-- =====================================================================

ALTER TABLE RRHH_PLANILLA_DETALLE
    ADD COLUMN FIRMA_PNG_PATH VARCHAR(300) NULL AFTER TOKEN_EXPIRA;
