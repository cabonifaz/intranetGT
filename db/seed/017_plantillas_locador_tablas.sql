-- =====================================================================
-- Reemplaza el contenido semilla de las 4 plantillas LOCADOR (sembradas
-- en 014_plantillas_contrato_iniciales.sql) para que coincidan con los
-- acuerdos de servicios reales de la empresa: tablas con bordes (sintaxis
-- "| celda | celda |" dentro del CONTENIDO, ver PdfWriter.tabla()),
-- clausula nueva de HORARIO, numeracion 1/2/4/5/6/7/8 (la empresa no usa
-- "3." en sus acuerdos reales) y fecha corta (DD/MM/AAAA) en el
-- encabezado. La fila "FUNCIONES ESPECÍFICAS" se quito de "1. DATOS DE
-- INGRESO" -- un locador de servicios no tiene funciones de puesto (no
-- hay subordinacion, clausula 7 de cada plantilla ya lo deja explicito),
-- solo PLANILLA las tiene (ver RRHH_CONTRATO.FUNCIONES,
-- SP_RRHH_CONTRATO_CREAR/ACTUALIZAR_FUNCIONES). Si ya editaste estas
-- plantillas desde /rrhh/contratos/plantillas, esto SOBRESCRIBE ese
-- contenido -- revisa antes de aplicar si ya no es el original de 014.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

SET @tc_loc = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_CONTRATO' AND CODIGO = 'LOCADOR');

SET @tp_hora = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'POR_HORA');
SET @tp_proyecto = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'POR_PROYECTO');
SET @tp_mensual = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'MENSUAL');
SET @tp_jornada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'POR_JORNADA');

SET @p_hora = (SELECT ID_PLANTILLA FROM RRHH_CONTRATO_PLANTILLA WHERE ID_TIPO_CONTRATO = @tc_loc AND ID_TIPO_PAGO_LOCADOR = @tp_hora LIMIT 1);
SET @p_proyecto = (SELECT ID_PLANTILLA FROM RRHH_CONTRATO_PLANTILLA WHERE ID_TIPO_CONTRATO = @tc_loc AND ID_TIPO_PAGO_LOCADOR = @tp_proyecto LIMIT 1);
SET @p_mensual = (SELECT ID_PLANTILLA FROM RRHH_CONTRATO_PLANTILLA WHERE ID_TIPO_CONTRATO = @tc_loc AND ID_TIPO_PAGO_LOCADOR = @tp_mensual LIMIT 1);
SET @p_jornada = (SELECT ID_PLANTILLA FROM RRHH_CONTRATO_PLANTILLA WHERE ID_TIPO_CONTRATO = @tc_loc AND ID_TIPO_PAGO_LOCADOR = @tp_jornada LIMIT 1);

-- Parrafo intro: fecha corta + "relacion laboral" (redaccion real)
UPDATE RRHH_CONTRATO_PLANTILLA
   SET PARRAFO_INTRO = 'Fecha: {{FECHA_FIRMA_CORTA}}\nConste por el presente documento denominado "Acuerdo de Servicios" (en adelante, el "Acuerdo") que se establece entre {{EMPLEADOR_RAZON_SOCIAL}}, identificado con RUC N° {{EMPLEADOR_RUC}}, debidamente representada por su Gerente General, el señor {{EMPLEADOR_REPRESENTANTE}}, identificado con DNI N° {{EMPLEADOR_REPRESENTANTE_DNI}}, en adelante denominado "CLIENTE", y {{NOMBRE_COMPLETO}}, identificado(a) con {{TIPO_DOCUMENTO}} N° {{NRO_DOCUMENTO}}, en adelante denominado "PROVEEDOR", con el objetivo de establecer los términos y condiciones de la relación laboral. Ambas partes acuerdan lo siguiente:'
 WHERE ID_PLANTILLA IN (@p_hora, @p_proyecto, @p_mensual, @p_jornada);

DELETE FROM RRHH_CONTRATO_PLANTILLA_CLAUSULA WHERE ID_PLANTILLA IN (@p_hora, @p_proyecto, @p_mensual, @p_jornada);

-- Por hora
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p_hora, 10, '1. DATOS DE INGRESO', '| POSICIÓN | {{CARGO_MAYUSCULAS}} |\n| FECHA DE INGRESO | {{FECHA_INICIO_CORTA}} |', @id_activo),
    (@p_hora, 20, '2. PAGOS', '| PERIODO | NOMBRE DEL PROYECTO | PAGO X HORA |\n{{DETALLE_PAGO_FILAS}}\nEl Proveedor se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico, por el monto que se pacta en el presente acuerdo, según un reporte de horas utilizado en relación con la tarifa pactada por hora. Este reporte deberá ser entregado a través de la herramienta Clockify de EL CLIENTE.', @id_activo),
    (@p_hora, 40, '4. INFORMACIÓN BANCARIA', '| NRO. DE CUENTA | {{NRO_CUENTA}} |\n| NRO. CÓDIGO INTERBANCARIO - CCI | {{CCI}} |\n| NOMBRE DEL BANCO | {{BANCO}} |', @id_activo),
    (@p_hora, 50, '5. VIGENCIA', 'Este acuerdo entrará en vigencia desde la fecha señalada en la cláusula primera, siendo que a partir de esa fecha se contabilizarán las horas para su pago respectivo, así mismo el término será posterior a la comunicación expresa de EL CLIENTE.', @id_activo),
    (@p_hora, 60, '6. HORARIO', 'No existe un horario específico establecido, puesto que EL PROVEEDOR podrá realizar sus servicios en el horario que le sea posible y en la cantidad de horas que le sean necesarias para el cumplimiento de sus servicios.', @id_activo),
    (@p_hora, 70, '7. SUBORDINACIÓN LABORAL', 'El presente acuerdo de prestación de servicios es de naturaleza civil, por lo tanto queda establecido que EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y en tal sentido no existe subordinación laboral de ninguna índole, puesto que EL PROVEEDOR tiene plena libertad en el ejercicio de sus servicios profesionales, procurando cautelar eficientemente los intereses de este y cumpliendo los servicios solicitados por EL CLIENTE.', @id_activo),
    (@p_hora, 80, '8. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);

-- Por proyecto
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p_proyecto, 10, '1. DATOS DE INGRESO', '| POSICIÓN | {{CARGO_MAYUSCULAS}} |\n| FECHA DE INGRESO | {{FECHA_INICIO_CORTA}} |', @id_activo),
    (@p_proyecto, 20, '2. PAGOS', '| PERIODO | NOMBRE DEL PROYECTO | MONTO DEL PROYECTO |\n{{DETALLE_PAGO_FILAS}}\nEl Proveedor se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico, por el monto que se pacta en el presente acuerdo.', @id_activo),
    (@p_proyecto, 40, '4. INFORMACIÓN BANCARIA', '| NRO. DE CUENTA | {{NRO_CUENTA}} |\n| NRO. CÓDIGO INTERBANCARIO - CCI | {{CCI}} |\n| NOMBRE DEL BANCO | {{BANCO}} |', @id_activo),
    (@p_proyecto, 50, '5. VIGENCIA', 'Este acuerdo entrará en vigencia desde la fecha señalada en la cláusula primera, siendo que a partir de esa fecha se contabilizarán las horas para su pago respectivo, así mismo el término será posterior a la comunicación expresa de EL CLIENTE.', @id_activo),
    (@p_proyecto, 60, '6. HORARIO', 'No existe un horario específico establecido, puesto que EL PROVEEDOR podrá realizar sus servicios en el horario que le sea posible y en la cantidad de horas que le sean necesarias para el cumplimiento de sus servicios.', @id_activo),
    (@p_proyecto, 70, '7. SUBORDINACIÓN LABORAL', 'El presente acuerdo de prestación de servicios es de naturaleza civil, por lo tanto queda establecido que EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y en tal sentido no existe subordinación laboral de ninguna índole, puesto que EL PROVEEDOR tiene plena libertad en el ejercicio de sus servicios profesionales, procurando cautelar eficientemente los intereses de este y cumpliendo los servicios solicitados por EL CLIENTE.', @id_activo),
    (@p_proyecto, 80, '8. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);

-- Mensual
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p_mensual, 10, '1. DATOS DE INGRESO', '| POSICIÓN | {{CARGO_MAYUSCULAS}} |\n| FECHA DE INGRESO | {{FECHA_INICIO_CORTA}} |', @id_activo),
    (@p_mensual, 20, '2. PAGOS', '| PERIODO | NOMBRE DEL PROYECTO | PAGO MENSUAL |\n{{DETALLE_PAGO_FILAS}}\nEl Proveedor se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico, por el monto que se pacta en el presente acuerdo.', @id_activo),
    (@p_mensual, 40, '4. INFORMACIÓN BANCARIA', '| NRO. DE CUENTA | {{NRO_CUENTA}} |\n| NRO. CÓDIGO INTERBANCARIO - CCI | {{CCI}} |\n| NOMBRE DEL BANCO | {{BANCO}} |', @id_activo),
    (@p_mensual, 50, '5. VIGENCIA', 'Este acuerdo entrará en vigencia desde la fecha señalada en la cláusula primera, siendo que a partir de esa fecha se contabilizarán las horas para su pago respectivo, así mismo el término será posterior a la comunicación expresa de EL CLIENTE.', @id_activo),
    (@p_mensual, 60, '6. HORARIO', 'No existe un horario específico establecido, puesto que EL PROVEEDOR podrá realizar sus servicios en el horario que le sea posible y en la cantidad de horas que le sean necesarias para el cumplimiento de sus servicios.', @id_activo),
    (@p_mensual, 70, '7. SUBORDINACIÓN LABORAL', 'El presente acuerdo de prestación de servicios es de naturaleza civil, por lo tanto queda establecido que EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y en tal sentido no existe subordinación laboral de ninguna índole, puesto que EL PROVEEDOR tiene plena libertad en el ejercicio de sus servicios profesionales, procurando cautelar eficientemente los intereses de este y cumpliendo los servicios solicitados por EL CLIENTE.', @id_activo),
    (@p_mensual, 80, '8. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);

-- Por jornada diaria
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p_jornada, 10, '1. DATOS DE INGRESO', '| POSICIÓN | {{CARGO_MAYUSCULAS}} |\n| FECHA DE INGRESO | {{FECHA_INICIO_CORTA}} |', @id_activo),
    (@p_jornada, 20, '2. PAGOS', '| PERIODO | NOMBRE DEL PROYECTO | PAGO POR JORNADA DIARIA |\n{{DETALLE_PAGO_FILAS}}\nEl Proveedor se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico, por el monto que se pacta en el presente acuerdo.', @id_activo),
    (@p_jornada, 40, '4. INFORMACIÓN BANCARIA', '| NRO. DE CUENTA | {{NRO_CUENTA}} |\n| NRO. CÓDIGO INTERBANCARIO - CCI | {{CCI}} |\n| NOMBRE DEL BANCO | {{BANCO}} |', @id_activo),
    (@p_jornada, 50, '5. VIGENCIA', 'Este acuerdo entrará en vigencia desde la fecha señalada en la cláusula primera, siendo que a partir de esa fecha se contabilizarán las horas para su pago respectivo, así mismo el término será posterior a la comunicación expresa de EL CLIENTE.', @id_activo),
    (@p_jornada, 60, '6. HORARIO', 'No existe un horario específico establecido, puesto que EL PROVEEDOR podrá realizar sus servicios en el horario que le sea posible y en la cantidad de horas que le sean necesarias para el cumplimiento de sus servicios.', @id_activo),
    (@p_jornada, 70, '7. SUBORDINACIÓN LABORAL', 'El presente acuerdo de prestación de servicios es de naturaleza civil, por lo tanto queda establecido que EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y en tal sentido no existe subordinación laboral de ninguna índole, puesto que EL PROVEEDOR tiene plena libertad en el ejercicio de sus servicios profesionales, procurando cautelar eficientemente los intereses de este y cumpliendo los servicios solicitados por EL CLIENTE.', @id_activo),
    (@p_jornada, 80, '8. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);
