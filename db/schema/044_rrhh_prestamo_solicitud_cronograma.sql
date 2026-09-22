-- =====================================================================
-- La solicitud de un PRESTAMO (no ADELANTO_SUELDO) debe indicar de una
-- vez el cronograma que el solicitante propone -- moneda y monto ya se
-- guardaban, faltaba el N de cuotas y el mes/anio de inicio -- para que
-- RRHH no arme el cronograma a ciegas al otorgar (SP_RRHH_PRESTAMO_
-- OTORGAR sigue permitiendo ajustarlo antes de confirmar). Para un
-- ADELANTO_SUELDO estas tres columnas quedan NULL: es una sola cuota,
-- con el monto limitado a un % del sueldo fijo del beneficiario -- ver
-- SP_RRHH_PRESTAMO_CREAR/SOLICITAR y SP_RRHH_CONTRATO_SUELDO_FIJO_VIGENTE.
-- =====================================================================

ALTER TABLE RRHH_PRESTAMO
    ADD COLUMN NRO_CUOTAS_SOLICITADO INT UNSIGNED NULL AFTER DESCRIPCION,
    ADD COLUMN ANIO_INICIO_SOLICITADO SMALLINT UNSIGNED NULL AFTER NRO_CUOTAS_SOLICITADO,
    ADD COLUMN MES_INICIO_SOLICITADO TINYINT UNSIGNED NULL AFTER ANIO_INICIO_SOLICITADO;
