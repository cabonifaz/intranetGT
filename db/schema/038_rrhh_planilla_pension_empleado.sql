-- =====================================================================
-- Datos de pension/retencion a nivel de PERSONA (no de contrato --
-- RRHH_EMPLEADO es 1:1 con USUARIO y estos datos aplican al colaborador
-- sin importar cual de sus contratos se este calculando):
--  - ID_SISTEMA_PENSION/ID_AFP_FONDO: solo aplica a PLANILLA (AFP vs ONP,
--    y si es AFP, que fondo -- cada fondo tiene su propia comision, ver
--    RRHH_PLANILLA_PARAMETRO_AFP_FONDO). NULL si la persona es
--    exclusivamente LOCADOR o si RRHH todavia no lo configuro.
--  - SUSPENSION_RETENCION_4TA_HASTA: constancia de suspension de
--    retenciones de renta de 4ta (SUNAT) para locadores -- se modela
--    como fecha de vencimiento (autoexpira) en vez de un booleano, para
--    no depender de que alguien se acuerde de desmarcarla cada año.
--    Vigente si HOY <= esta fecha.
-- =====================================================================

ALTER TABLE RRHH_EMPLEADO
    ADD COLUMN ID_SISTEMA_PENSION INT UNSIGNED NULL,
    ADD COLUMN ID_AFP_FONDO INT UNSIGNED NULL,
    ADD COLUMN SUSPENSION_RETENCION_4TA_HASTA DATE NULL;

ALTER TABLE RRHH_EMPLEADO
    ADD CONSTRAINT FK_RRHH_EMPLEADO_SISTEMA_PENSION FOREIGN KEY (ID_SISTEMA_PENSION) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO),
    ADD CONSTRAINT FK_RRHH_EMPLEADO_AFP_FONDO FOREIGN KEY (ID_AFP_FONDO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO);
