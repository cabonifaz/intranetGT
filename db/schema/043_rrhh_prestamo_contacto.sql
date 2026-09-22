-- =====================================================================
-- El beneficiario de un prestamo/adelanto puede ser un trabajador
-- (USUARIO, con descuento automatico en su planilla) o un contacto
-- externo del directorio (DIRECTORIO_CONTACTO_EXTERNO, sin planilla --
-- su repago se marca a mano, ver SP_RRHH_PRESTAMO_CUOTA_MARCAR_PAGADA_MANUAL).
-- Exactamente uno de los dos, nunca ambos ni ninguno -- lo valida
-- SP_RRHH_PRESTAMO_CREAR/SOLICITAR (mismo criterio que el acreedor de
-- PASIVO en SP_PASIVO_CREAR).
-- =====================================================================

ALTER TABLE RRHH_PRESTAMO
    MODIFY COLUMN ID_USUARIO INT UNSIGNED NULL,
    ADD COLUMN ID_CONTACTO INT UNSIGNED NULL AFTER ID_USUARIO,
    ADD CONSTRAINT FK_PRESTAMO_CONTACTO FOREIGN KEY (ID_CONTACTO) REFERENCES DIRECTORIO_CONTACTO_EXTERNO (ID_CONTACTO);

CREATE INDEX IX_PRESTAMO_CONTACTO ON RRHH_PRESTAMO (ID_CONTACTO);
