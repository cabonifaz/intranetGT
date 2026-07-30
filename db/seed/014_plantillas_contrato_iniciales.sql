-- =====================================================================
-- Plantillas iniciales del maestro de contratos (una por regimen), para
-- que ningun regimen quede bloqueado sin poder generar contratos. El
-- contenido es el mismo que antes vivia hardcodeado en
-- src/lib/rrhh/generar-contrato-pdf.ts -- ahora es editable por RRHH
-- desde /rrhh/contratos/plantillas (titulo, parrafo intro y clausulas).
-- Placeholders disponibles: ver NOMBRES_TOKENS en
-- src/lib/rrhh/plantilla-tokens.ts.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

SET @tc_ft = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_CONTRATO' AND CODIGO = 'PLANILLA_FULLTIME');
SET @tc_pt = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_CONTRATO' AND CODIGO = 'PLANILLA_PARTTIME');
SET @tc_loc = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_CONTRATO' AND CODIGO = 'LOCADOR');

SET @tp_hora = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'POR_HORA');
SET @tp_proyecto = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'POR_PROYECTO');
SET @tp_mensual = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'MENSUAL');
SET @tp_jornada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'TIPO_PAGO_LOCADOR' AND CODIGO = 'POR_JORNADA');

-- =====================================================================
-- 1. PLANILLA - Tiempo completo
-- =====================================================================
INSERT INTO RRHH_CONTRATO_PLANTILLA (ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, NOMBRE, TITULO_DOCUMENTO, PARRAFO_INTRO, ID_ESTADO)
VALUES (
    @tc_ft, NULL, 'Contrato de trabajo a tiempo completo', 'CONTRATO DE TRABAJO A TIEMPO COMPLETO',
    'Conste por el presente documento, el Contrato de Trabajo a Tiempo Completo que celebran, de una parte: {{EMPLEADOR_RAZON_SOCIAL}}, con RUC N° {{EMPLEADOR_RUC}}, con domicilio fiscal en {{EMPLEADOR_DOMICILIO}}, debidamente representada por su Gerente General, el señor {{EMPLEADOR_REPRESENTANTE}}, identificado con DNI N° {{EMPLEADOR_REPRESENTANTE_DNI}}, a quien en adelante se le denominará EL EMPLEADOR; Y de la otra parte: {{NOMBRE_COMPLETO}}, identificado(a) con {{TIPO_DOCUMENTO}} N° {{NRO_DOCUMENTO}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL(LA) TRABAJADOR(A); En los términos y condiciones siguientes:',
    @id_activo
);
SET @p = LAST_INSERT_ID();
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p, 10, 'PRIMERA: DEL OBJETO DEL CONTRATO', 'EL EMPLEADOR contrata bajo la modalidad de tiempo completo los servicios personales de EL(LA) TRABAJADOR(A) para que desempeñe el cargo de {{CARGO_MAYUSCULAS}}.', @id_activo),
    (@p, 20, 'SEGUNDA: DE LAS FUNCIONES', '{{FUNCIONES}}', @id_activo),
    (@p, 30, 'TERCERA: DE LA JORNADA DE TRABAJO', 'La jornada de trabajo será la ordinaria máxima legal, conforme al horario que EL EMPLEADOR comunique a EL(LA) TRABAJADOR(A).', @id_activo),
    (@p, 40, 'CUARTA: DE LA REMUNERACIÓN', 'EL(LA) TRABAJADOR(A) percibirá una remuneración mensual bruta de {{TOTAL_REMUNERACION}}, compuesta por los siguientes conceptos:\n{{DETALLE_REMUNERACION}}\nDe este monto se deducirán las aportaciones de ley a cargo de EL(LA) TRABAJADOR(A) (AFP u ONP). El pago se realizará mediante depósito en la cuenta indicada por EL(LA) TRABAJADOR(A).', @id_activo),
    (@p, 50, 'QUINTA: DEL PLAZO DEL CONTRATO Y PERIODO DE PRUEBA', 'El presente contrato inicia el {{FECHA_INICIO}} y termina el {{FECHA_FIN}}. De conformidad con el Artículo 10° del TUO de la Ley de Productividad y Competitividad Laboral, el periodo de prueba es de tres (3) meses. Durante este periodo, cualquiera de las partes puede dar por resuelto el contrato sin expresión de causa ni derecho a indemnización.', @id_activo),
    (@p, 60, 'SEXTA: DE LA CONFIDENCIALIDAD', 'EL(LA) TRABAJADOR(A) se compromete a mantener en estricta reserva y no divulgar a terceros la información confidencial de EL EMPLEADOR a la que tenga acceso por su puesto, incluso después de terminada la relación laboral.', @id_activo),
    (@p, 70, 'SÉPTIMA: DE LA LEGISLACIÓN APLICABLE', 'En todo lo no previsto por este contrato, se aplican las disposiciones de la legislación laboral peruana vigente.', @id_activo),
    (@p, 80, NULL, 'En señal de conformidad, las partes suscriben el presente contrato en la ciudad de Lima, el {{FECHA_FIRMA}}.', @id_activo);

-- =====================================================================
-- 2. PLANILLA - Tiempo parcial
-- =====================================================================
INSERT INTO RRHH_CONTRATO_PLANTILLA (ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, NOMBRE, TITULO_DOCUMENTO, PARRAFO_INTRO, ID_ESTADO)
VALUES (
    @tc_pt, NULL, 'Contrato de trabajo a tiempo parcial', 'CONTRATO DE TRABAJO A TIEMPO PARCIAL',
    'Conste por el presente documento, el Contrato de Trabajo a Tiempo Parcial que celebran, de una parte: {{EMPLEADOR_RAZON_SOCIAL}}, con RUC N° {{EMPLEADOR_RUC}}, con domicilio fiscal en {{EMPLEADOR_DOMICILIO}}, debidamente representada por su Gerente General, el señor {{EMPLEADOR_REPRESENTANTE}}, identificado con DNI N° {{EMPLEADOR_REPRESENTANTE_DNI}}, a quien en adelante se le denominará EL EMPLEADOR; Y de la otra parte: {{NOMBRE_COMPLETO}}, identificado(a) con {{TIPO_DOCUMENTO}} N° {{NRO_DOCUMENTO}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL(LA) TRABAJADOR(A); En los términos y condiciones siguientes:',
    @id_activo
);
SET @p = LAST_INSERT_ID();
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p, 10, 'PRIMERA: DEL OBJETO DEL CONTRATO', 'EL EMPLEADOR contrata bajo la modalidad de tiempo parcial los servicios personales de EL(LA) TRABAJADOR(A) para que desempeñe el cargo de {{CARGO_MAYUSCULAS}}.', @id_activo),
    (@p, 20, 'SEGUNDA: DE LAS FUNCIONES', '{{FUNCIONES}}', @id_activo),
    (@p, 30, 'TERCERA: DE LA JORNADA DE TRABAJO', 'La jornada de trabajo será a tiempo parcial, sin superar en promedio las cuatro (4) horas diarias, conforme al horario que EL EMPLEADOR comunique a EL(LA) TRABAJADOR(A).', @id_activo),
    (@p, 40, 'CUARTA: DE LA REMUNERACIÓN', 'EL(LA) TRABAJADOR(A) percibirá una remuneración mensual bruta de {{TOTAL_REMUNERACION}}, compuesta por los siguientes conceptos:\n{{DETALLE_REMUNERACION}}\nDe este monto se deducirán las aportaciones de ley a cargo de EL(LA) TRABAJADOR(A) (AFP u ONP). El pago se realizará mediante depósito en la cuenta indicada por EL(LA) TRABAJADOR(A).', @id_activo),
    (@p, 50, 'QUINTA: DEL PLAZO DEL CONTRATO Y PERIODO DE PRUEBA', 'El presente contrato inicia el {{FECHA_INICIO}} y termina el {{FECHA_FIN}}. De conformidad con el Artículo 10° del TUO de la Ley de Productividad y Competitividad Laboral, el periodo de prueba es de tres (3) meses. Durante este periodo, cualquiera de las partes puede dar por resuelto el contrato sin expresión de causa ni derecho a indemnización.', @id_activo),
    (@p, 60, 'SEXTA: DE LA CONFIDENCIALIDAD', 'EL(LA) TRABAJADOR(A) se compromete a mantener en estricta reserva y no divulgar a terceros la información confidencial de EL EMPLEADOR a la que tenga acceso por su puesto, incluso después de terminada la relación laboral.', @id_activo),
    (@p, 70, 'SÉPTIMA: DE LA LEGISLACIÓN APLICABLE', 'En todo lo no previsto por este contrato, se aplican las disposiciones de la legislación laboral peruana vigente.', @id_activo),
    (@p, 80, NULL, 'En señal de conformidad, las partes suscriben el presente contrato en la ciudad de Lima, el {{FECHA_FIRMA}}.', @id_activo);

-- =====================================================================
-- Locador de servicios: mismo contenido base para los 4 tipos de pago
-- (DETALLE_PAGO ya llega formateado segun corresponda -- por hora, por
-- proyecto, mensual o por jornada -- calculado en construirTokens()).
-- =====================================================================

-- 3. Locador - Por hora
INSERT INTO RRHH_CONTRATO_PLANTILLA (ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, NOMBRE, TITULO_DOCUMENTO, PARRAFO_INTRO, ID_ESTADO)
VALUES (
    @tc_loc, @tp_hora, 'Acuerdo de prestacion de servicios - Por hora', 'ACUERDO DE PRESTACIÓN DE SERVICIOS',
    'Fecha: {{FECHA_FIRMA}}\nConste por el presente documento denominado "Acuerdo de Servicios" (en adelante, el "Acuerdo") que se establece entre {{EMPLEADOR_RAZON_SOCIAL}}, identificado con RUC N° {{EMPLEADOR_RUC}}, debidamente representada por su Gerente General, el señor {{EMPLEADOR_REPRESENTANTE}}, identificado con DNI N° {{EMPLEADOR_REPRESENTANTE_DNI}}, en adelante denominado "CLIENTE", y {{NOMBRE_COMPLETO}}, identificado(a) con {{TIPO_DOCUMENTO}} N° {{NRO_DOCUMENTO}}, en adelante denominado "PROVEEDOR", con el objetivo de establecer los términos y condiciones de la relación de servicios. Ambas partes acuerdan lo siguiente:',
    @id_activo
);
SET @p = LAST_INSERT_ID();
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p, 10, '1. DATOS DE INGRESO', 'Posición: {{CARGO_MAYUSCULAS}}\nFecha de ingreso: {{FECHA_INICIO}}\nFunciones específicas: {{FUNCIONES}}', @id_activo),
    (@p, 20, '2. PAGOS', '{{DETALLE_PAGO}}\nEl PROVEEDOR se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico por el monto pactado en el presente acuerdo, según el reporte de horas/servicios correspondiente.', @id_activo),
    (@p, 30, '3. INFORMACIÓN BANCARIA', 'N° de cuenta: {{NRO_CUENTA}}\nCódigo interbancario (CCI): {{CCI}}\nBanco: {{BANCO}}', @id_activo),
    (@p, 40, '4. VIGENCIA', 'Este acuerdo tiene vigencia desde el {{FECHA_INICIO}} hasta el {{FECHA_FIN}}.', @id_activo),
    (@p, 50, '5. SUBORDINACIÓN', 'El presente acuerdo es de naturaleza civil. EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y no existe subordinación laboral de ninguna índole.', @id_activo),
    (@p, 60, '6. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);

-- 4. Locador - Por proyecto
INSERT INTO RRHH_CONTRATO_PLANTILLA (ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, NOMBRE, TITULO_DOCUMENTO, PARRAFO_INTRO, ID_ESTADO)
VALUES (
    @tc_loc, @tp_proyecto, 'Acuerdo de prestacion de servicios - Por proyecto', 'ACUERDO DE PRESTACIÓN DE SERVICIOS',
    'Fecha: {{FECHA_FIRMA}}\nConste por el presente documento denominado "Acuerdo de Servicios" (en adelante, el "Acuerdo") que se establece entre {{EMPLEADOR_RAZON_SOCIAL}}, identificado con RUC N° {{EMPLEADOR_RUC}}, debidamente representada por su Gerente General, el señor {{EMPLEADOR_REPRESENTANTE}}, identificado con DNI N° {{EMPLEADOR_REPRESENTANTE_DNI}}, en adelante denominado "CLIENTE", y {{NOMBRE_COMPLETO}}, identificado(a) con {{TIPO_DOCUMENTO}} N° {{NRO_DOCUMENTO}}, en adelante denominado "PROVEEDOR", con el objetivo de establecer los términos y condiciones de la relación de servicios. Ambas partes acuerdan lo siguiente:',
    @id_activo
);
SET @p = LAST_INSERT_ID();
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p, 10, '1. DATOS DE INGRESO', 'Posición: {{CARGO_MAYUSCULAS}}\nFecha de ingreso: {{FECHA_INICIO}}\nFunciones específicas: {{FUNCIONES}}', @id_activo),
    (@p, 20, '2. PAGOS', '{{DETALLE_PAGO}}\nEl PROVEEDOR se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico por el monto pactado en el presente acuerdo, según el entregable correspondiente.', @id_activo),
    (@p, 30, '3. INFORMACIÓN BANCARIA', 'N° de cuenta: {{NRO_CUENTA}}\nCódigo interbancario (CCI): {{CCI}}\nBanco: {{BANCO}}', @id_activo),
    (@p, 40, '4. VIGENCIA', 'Este acuerdo tiene vigencia desde el {{FECHA_INICIO}} hasta el {{FECHA_FIN}}, o hasta la entrega conforme del proyecto pactado, lo que ocurra primero.', @id_activo),
    (@p, 50, '5. SUBORDINACIÓN', 'El presente acuerdo es de naturaleza civil. EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y no existe subordinación laboral de ninguna índole.', @id_activo),
    (@p, 60, '6. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);

-- 5. Locador - Mensual
INSERT INTO RRHH_CONTRATO_PLANTILLA (ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, NOMBRE, TITULO_DOCUMENTO, PARRAFO_INTRO, ID_ESTADO)
VALUES (
    @tc_loc, @tp_mensual, 'Acuerdo de prestacion de servicios - Mensual', 'ACUERDO DE PRESTACIÓN DE SERVICIOS',
    'Fecha: {{FECHA_FIRMA}}\nConste por el presente documento denominado "Acuerdo de Servicios" (en adelante, el "Acuerdo") que se establece entre {{EMPLEADOR_RAZON_SOCIAL}}, identificado con RUC N° {{EMPLEADOR_RUC}}, debidamente representada por su Gerente General, el señor {{EMPLEADOR_REPRESENTANTE}}, identificado con DNI N° {{EMPLEADOR_REPRESENTANTE_DNI}}, en adelante denominado "CLIENTE", y {{NOMBRE_COMPLETO}}, identificado(a) con {{TIPO_DOCUMENTO}} N° {{NRO_DOCUMENTO}}, en adelante denominado "PROVEEDOR", con el objetivo de establecer los términos y condiciones de la relación de servicios. Ambas partes acuerdan lo siguiente:',
    @id_activo
);
SET @p = LAST_INSERT_ID();
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p, 10, '1. DATOS DE INGRESO', 'Posición: {{CARGO_MAYUSCULAS}}\nFecha de ingreso: {{FECHA_INICIO}}\nFunciones específicas: {{FUNCIONES}}', @id_activo),
    (@p, 20, '2. PAGOS', '{{DETALLE_PAGO}}\nEl PROVEEDOR se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico por el monto pactado en el presente acuerdo, según el reporte de servicios correspondiente.', @id_activo),
    (@p, 30, '3. INFORMACIÓN BANCARIA', 'N° de cuenta: {{NRO_CUENTA}}\nCódigo interbancario (CCI): {{CCI}}\nBanco: {{BANCO}}', @id_activo),
    (@p, 40, '4. VIGENCIA', 'Este acuerdo tiene vigencia desde el {{FECHA_INICIO}} hasta el {{FECHA_FIN}}.', @id_activo),
    (@p, 50, '5. SUBORDINACIÓN', 'El presente acuerdo es de naturaleza civil. EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y no existe subordinación laboral de ninguna índole.', @id_activo),
    (@p, 60, '6. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);

-- 6. Locador - Por jornada diaria
INSERT INTO RRHH_CONTRATO_PLANTILLA (ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, NOMBRE, TITULO_DOCUMENTO, PARRAFO_INTRO, ID_ESTADO)
VALUES (
    @tc_loc, @tp_jornada, 'Acuerdo de prestacion de servicios - Por jornada', 'ACUERDO DE PRESTACIÓN DE SERVICIOS',
    'Fecha: {{FECHA_FIRMA}}\nConste por el presente documento denominado "Acuerdo de Servicios" (en adelante, el "Acuerdo") que se establece entre {{EMPLEADOR_RAZON_SOCIAL}}, identificado con RUC N° {{EMPLEADOR_RUC}}, debidamente representada por su Gerente General, el señor {{EMPLEADOR_REPRESENTANTE}}, identificado con DNI N° {{EMPLEADOR_REPRESENTANTE_DNI}}, en adelante denominado "CLIENTE", y {{NOMBRE_COMPLETO}}, identificado(a) con {{TIPO_DOCUMENTO}} N° {{NRO_DOCUMENTO}}, en adelante denominado "PROVEEDOR", con el objetivo de establecer los términos y condiciones de la relación de servicios. Ambas partes acuerdan lo siguiente:',
    @id_activo
);
SET @p = LAST_INSERT_ID();
INSERT INTO RRHH_CONTRATO_PLANTILLA_CLAUSULA (ID_PLANTILLA, ORDEN, TITULO, CONTENIDO, ID_ESTADO) VALUES
    (@p, 10, '1. DATOS DE INGRESO', 'Posición: {{CARGO_MAYUSCULAS}}\nFecha de ingreso: {{FECHA_INICIO}}\nFunciones específicas: {{FUNCIONES}}', @id_activo),
    (@p, 20, '2. PAGOS', '{{DETALLE_PAGO}}\nEl PROVEEDOR se compromete a generar el comprobante denominado Recibo por Honorarios Electrónico por el monto pactado en el presente acuerdo, según el reporte de jornadas correspondiente.', @id_activo),
    (@p, 30, '3. INFORMACIÓN BANCARIA', 'N° de cuenta: {{NRO_CUENTA}}\nCódigo interbancario (CCI): {{CCI}}\nBanco: {{BANCO}}', @id_activo),
    (@p, 40, '4. VIGENCIA', 'Este acuerdo tiene vigencia desde el {{FECHA_INICIO}} hasta el {{FECHA_FIN}}.', @id_activo),
    (@p, 50, '5. SUBORDINACIÓN', 'El presente acuerdo es de naturaleza civil. EL PROVEEDOR no está sujeto a relación de dependencia frente a EL CLIENTE, y no existe subordinación laboral de ninguna índole.', @id_activo),
    (@p, 60, '6. CONFORMIDAD', 'Este Acuerdo entra en vigor a partir de la fecha de la firma de ambas partes. Ambas partes han leído y comprendido los términos y condiciones del presente Acuerdo.', @id_activo);
