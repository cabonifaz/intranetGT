-- =====================================================================
-- Actualiza el contenido semilla de PLANILLA_FULLTIME y PLANILLA_PARTTIME
-- (sembradas en 014_plantillas_contrato_iniciales.sql) para aprovechar
-- los placeholders nuevos: jornada dinamica (DIAS_LABORALES/HORA_INICIO/
-- HORA_FIN/NOTA_JORNADA), monto en letras (TOTAL_REMUNERACION_LETRAS) y
-- giro del negocio (EMPLEADOR_GIRO_NEGOCIO). Si ya editaste estas
-- plantillas desde /rrhh/contratos/plantillas, esto SOBRESCRIBE ese
-- contenido -- revisa antes de aplicar si ya no es el original de 014.
-- =====================================================================

SET @tc_ft = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_CONTRATO' AND CODIGO = 'PLANILLA_FULLTIME');
SET @tc_pt = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_CONTRATO' AND CODIGO = 'PLANILLA_PARTTIME');

SET @p_ft = (SELECT ID_PLANTILLA FROM RRHH_CONTRATO_PLANTILLA WHERE ID_TIPO_CONTRATO = @tc_ft AND ID_TIPO_PAGO_LOCADOR IS NULL LIMIT 1);
SET @p_pt = (SELECT ID_PLANTILLA FROM RRHH_CONTRATO_PLANTILLA WHERE ID_TIPO_CONTRATO = @tc_pt AND ID_TIPO_PAGO_LOCADOR IS NULL LIMIT 1);

-- PRIMERA (ORDEN 10): incluye el giro del negocio
UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'EL EMPLEADOR es una empresa dedicada a {{EMPLEADOR_GIRO_NEGOCIO}}. Por el presente documento, EL EMPLEADOR contrata bajo la modalidad de tiempo completo los servicios personales de EL(LA) TRABAJADOR(A) para que desempeñe el cargo de {{CARGO_MAYUSCULAS}}.'
 WHERE ID_PLANTILLA = @p_ft AND ORDEN = 10;

UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'EL EMPLEADOR es una empresa dedicada a {{EMPLEADOR_GIRO_NEGOCIO}}. Por el presente documento, EL EMPLEADOR contrata bajo la modalidad de tiempo parcial los servicios personales de EL(LA) TRABAJADOR(A) para que desempeñe el cargo de {{CARGO_MAYUSCULAS}}.'
 WHERE ID_PLANTILLA = @p_pt AND ORDEN = 10;

-- TERCERA (ORDEN 30): jornada dinamica por contrato
UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'La jornada de trabajo será {{DIAS_LABORALES}}, en el horario de {{HORA_INICIO}} a {{HORA_FIN}}, conforme a la jornada ordinaria máxima legal. {{NOTA_JORNADA}}'
 WHERE ID_PLANTILLA = @p_ft AND ORDEN = 30;

UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'La jornada de trabajo será a tiempo parcial. Las partes acuerdan que EL(LA) TRABAJADOR(A) prestará servicios en una jornada que en ningún caso superará en promedio las cuatro (4) horas diarias.\nEl horario de trabajo será {{DIAS_LABORALES}}, en el horario de {{HORA_INICIO}} a {{HORA_FIN}}. {{NOTA_JORNADA}}\nEL EMPLEADOR se reserva el derecho de modificar este horario según las necesidades de la empresa, respetando siempre el límite legal para contratos a tiempo parcial.'
 WHERE ID_PLANTILLA = @p_pt AND ORDEN = 30;

-- CUARTA (ORDEN 40): monto en letras
UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'EL(LA) TRABAJADOR(A) percibirá una remuneración mensual bruta de {{TOTAL_REMUNERACION}} ({{TOTAL_REMUNERACION_LETRAS}}), compuesta por los siguientes conceptos:\n{{DETALLE_REMUNERACION}}\nDe este monto se deducirán las aportaciones de ley a cargo de EL(LA) TRABAJADOR(A) (AFP u ONP). El pago se realizará mediante depósito en la cuenta indicada por EL(LA) TRABAJADOR(A).'
 WHERE ID_PLANTILLA = @p_ft AND ORDEN = 40;

UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'EL(LA) TRABAJADOR(A) percibirá una remuneración mensual bruta de {{TOTAL_REMUNERACION}} ({{TOTAL_REMUNERACION_LETRAS}}), la cual es proporcional a la Remuneración Mínima Vital vigente de acuerdo a la jornada pactada, compuesta por los siguientes conceptos:\n{{DETALLE_REMUNERACION}}\nDe este monto se deducirán las aportaciones de ley a cargo de EL(LA) TRABAJADOR(A) (AFP u ONP). El pago se realizará mediante depósito en la cuenta indicada por EL(LA) TRABAJADOR(A).'
 WHERE ID_PLANTILLA = @p_pt AND ORDEN = 40;

-- Cierre (ORDEN 80): fecha desglosada en dia/mes/año
UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'En señal de conformidad, las partes firman el presente contrato en dos (2) ejemplares de igual tenor y valor, en la ciudad de Lima, a los {{FECHA_FIRMA_DIA}} días del mes de {{FECHA_FIRMA_MES}} del año {{FECHA_FIRMA_ANIO}}.'
 WHERE ID_PLANTILLA = @p_ft AND ORDEN = 80;

UPDATE RRHH_CONTRATO_PLANTILLA_CLAUSULA
   SET CONTENIDO = 'En señal de conformidad, las partes firman el presente contrato en dos (2) ejemplares de igual tenor y valor, en la ciudad de Lima, a los {{FECHA_FIRMA_DIA}} días del mes de {{FECHA_FIRMA_MES}} del año {{FECHA_FIRMA_ANIO}}.'
 WHERE ID_PLANTILLA = @p_pt AND ORDEN = 80;
