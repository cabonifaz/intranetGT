-- =====================================================================
-- Planilla mensual: la corrida del mes (RRHH_PLANILLA_MENSUAL) y su
-- detalle por colaborador/contrato (RRHH_PLANILLA_DETALLE). El bruto de
-- cada detalle no se recalcula aqui -- lo trae la app ya calculado (via
-- src/lib/rrhh/planilla/calculo.ts, alimentado con RRHH_PLANILLA_PARAMETRO
-- vigente) y estos procedimientos solo lo persisten, mismo criterio que
-- generarPeriodosPendientes/SP_RRHH_CONTRATO_PERIODO_PAGO_AGREGAR. La
-- generacion del mes REUSA RRHH_CONTRATO_PERIODO_PAGO/RRHH_CONTRATO_HORAS
-- para el bruto (no los reemplaza) -- el bruto de PLANILLA/LOCADOR
-- MENSUAL-POR_JORNADA-POR_PROYECTO es el MONTO de su periodo del mes;
-- el de LOCADOR POR_HORA es la suma de sus horas del mes (una moneda a
-- la vez, ver RRHH_PLANILLA_DETALLE_HORAS).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_CONTRATO_ELEGIBLE_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_CONTRATO_HORAS_DEL_PERIODO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_CONTRATO_ACUMULADO_ANIO;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_MENSUAL_OBTENER_O_CREAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_MENSUAL_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_MENSUAL_OBTENER;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_MENSUAL_EMITIR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_AGREGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_HORAS_VINCULAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_HORAS_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_OBTENER;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_ACTUALIZAR_MONTOS;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_MARCAR_PAGADO;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_MARCAR_PAGADO_MASIVO;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_EMITIR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_DETALLE_ELIMINAR;

DELIMITER $$

-- Contratos FIRMADOS (vigentes) con todo lo que la app necesita para
-- decidir el regimen y armar el bruto: tipo, tipo de pago locador,
-- tarifa (MENSUAL/POR_JORNADA/POR_PROYECTO), y la config de pension/
-- suspension 4ta de la persona (RRHH_EMPLEADO). No filtra por mes -- la
-- app decide, contrato por contrato, si ya tenia periodo vigente en el
-- mes pedido (FECHA_INICIO <= fin de mes AND (FECHA_FIN IS NULL OR
-- FECHA_FIN >= inicio de mes)).
CREATE PROCEDURE SP_RRHH_PLANILLA_CONTRATO_ELEGIBLE_LISTAR()
BEGIN
    SELECT c.ID_CONTRATO, c.ID_USUARIO, u.NOMBRES, u.APELLIDOS,
           c.CARGO, c.FECHA_INICIO, c.FECHA_FIN, c.TARIFA,
           c.ID_TIPO_CONTRATO, tc.CODIGO AS TIPO_CONTRATO_CODIGO,
           c.ID_TIPO_PAGO_LOCADOR, tpl.CODIGO AS TIPO_PAGO_LOCADOR_CODIGO,
           e.ID_SISTEMA_PENSION, sp.CODIGO AS SISTEMA_PENSION_CODIGO,
           e.ID_AFP_FONDO, af.CODIGO AS AFP_FONDO_CODIGO,
           e.SUSPENSION_RETENCION_4TA_HASTA
      FROM RRHH_CONTRATO c
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CONTRATO
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
      LEFT JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = c.ID_TIPO_PAGO_LOCADOR
      LEFT JOIN RRHH_EMPLEADO e ON e.ID_USUARIO = c.ID_USUARIO
      LEFT JOIN MAESTRO_MAESTRO sp ON sp.ID_MAESTRO = e.ID_SISTEMA_PENSION
      LEFT JOIN MAESTRO_MAESTRO af ON af.ID_MAESTRO = e.ID_AFP_FONDO
     WHERE ec.CODIGO = 'FIRMADO'
     ORDER BY u.APELLIDOS, u.NOMBRES;
END$$

-- Horas de un contrato POR_HORA para un periodo puntual ("JULIO 2026"),
-- con la moneda de cada RRHH_CONTRATO_PROYECTO -- la app decide si son
-- todas la misma moneda antes de sumarlas en un solo detalle de planilla.
CREATE PROCEDURE SP_RRHH_PLANILLA_CONTRATO_HORAS_DEL_PERIODO_LISTAR(
    IN p_id_contrato INT UNSIGNED,
    IN p_periodo VARCHAR(100)
)
BEGIN
    SELECT h.ID_CONTRATO_HORAS, h.HORAS, h.MONTO_CALCULADO,
           cp.ID_CONTRATO_PROYECTO, cp.ID_MONEDA, mo.CODIGO AS MONEDA_CODIGO
      FROM RRHH_CONTRATO_HORAS h
      JOIN RRHH_CONTRATO_PROYECTO cp ON cp.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
      JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = cp.ID_MONEDA
     WHERE cp.ID_CONTRATO = p_id_contrato AND h.PERIODO = p_periodo
       AND NOT EXISTS (SELECT 1 FROM RRHH_PLANILLA_DETALLE_HORAS pdh WHERE pdh.ID_CONTRATO_HORAS = h.ID_CONTRATO_HORAS);
END$$

-- Acumulado del año hasta (sin incluir) p_mes_hasta, para la proyeccion
-- anual de Renta 5ta (recalculada cada mes con lo ya calculado en meses
-- previos de RRHH_PLANILLA_DETALLE -- ver src/lib/rrhh/planilla/calculo.ts
-- calcularRenta5taMensual). Solo tiene sentido para PLANILLA -- LOCADOR
-- no acumula Renta 5ta, cada RxH se retiene independiente.
CREATE PROCEDURE SP_RRHH_PLANILLA_CONTRATO_ACUMULADO_ANIO(
    IN p_id_contrato INT UNSIGNED,
    IN p_anio SMALLINT UNSIGNED,
    IN p_mes_hasta TINYINT UNSIGNED
)
BEGIN
    SELECT COALESCE(SUM(d.MONTO_BRUTO), 0) AS BRUTO_ACUMULADO,
           COALESCE(SUM(d.MONTO_RETENCION_RENTA), 0) AS RETENCION_ACUMULADA
      FROM RRHH_PLANILLA_DETALLE d
      JOIN RRHH_PLANILLA_MENSUAL pm ON pm.ID_PLANILLA_MENSUAL = d.ID_PLANILLA_MENSUAL
     WHERE d.ID_CONTRATO = p_id_contrato AND pm.ANIO = p_anio AND pm.MES < p_mes_hasta;
END$$

-- Idempotente -- seguro reintentar "Generar planilla del mes" sin
-- duplicar el header (UQ_PM_ANIO_MES es el respaldo).
CREATE PROCEDURE SP_RRHH_PLANILLA_MENSUAL_OBTENER_O_CREAR(
    IN p_anio SMALLINT UNSIGNED,
    IN p_mes TINYINT UNSIGNED,
    IN p_periodo VARCHAR(100),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_planilla_mensual INT UNSIGNED
)
BEGIN
    DECLARE v_id_borrador INT UNSIGNED;

    SELECT ID_PLANILLA_MENSUAL INTO p_id_planilla_mensual
      FROM RRHH_PLANILLA_MENSUAL WHERE ANIO = p_anio AND MES = p_mes;

    IF p_id_planilla_mensual IS NULL THEN
        SET v_id_borrador = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PLANILLA_MENSUAL' AND CODIGO = 'BORRADOR' LIMIT 1);

        INSERT INTO RRHH_PLANILLA_MENSUAL (ANIO, MES, PERIODO, ID_ESTADO_PLANILLA, USUARIO_CREACION)
        VALUES (p_anio, p_mes, p_periodo, v_id_borrador, p_id_usuario_creacion);

        SET p_id_planilla_mensual = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_RRHH_PLANILLA_MENSUAL_LISTAR()
BEGIN
    SELECT pm.ID_PLANILLA_MENSUAL, pm.ANIO, pm.MES, pm.PERIODO,
           pm.ID_ESTADO_PLANILLA, ep.CODIGO AS ESTADO_PLANILLA_CODIGO, ep.DESCRIPCION AS ESTADO_PLANILLA_DESCRIPCION,
           pm.FECHA_EMISION,
           (SELECT COUNT(*) FROM RRHH_PLANILLA_DETALLE d WHERE d.ID_PLANILLA_MENSUAL = pm.ID_PLANILLA_MENSUAL) AS TOTAL_COLABORADORES,
           (
               SELECT COUNT(*) FROM RRHH_PLANILLA_DETALLE d
                 JOIN MAESTRO_MAESTRO ee ON ee.ID_MAESTRO = d.ID_ESTADO_EMISION
                WHERE d.ID_PLANILLA_MENSUAL = pm.ID_PLANILLA_MENSUAL AND ee.CODIGO = 'EMITIDA'
           ) AS TOTAL_EMITIDOS
      FROM RRHH_PLANILLA_MENSUAL pm
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = pm.ID_ESTADO_PLANILLA
     ORDER BY pm.ANIO DESC, pm.MES DESC;
END$$

CREATE PROCEDURE SP_RRHH_PLANILLA_MENSUAL_OBTENER(
    IN p_id_planilla_mensual INT UNSIGNED
)
BEGIN
    SELECT pm.ID_PLANILLA_MENSUAL, pm.ANIO, pm.MES, pm.PERIODO,
           pm.ID_ESTADO_PLANILLA, ep.CODIGO AS ESTADO_PLANILLA_CODIGO, ep.DESCRIPCION AS ESTADO_PLANILLA_DESCRIPCION,
           pm.FECHA_EMISION
      FROM RRHH_PLANILLA_MENSUAL pm
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = pm.ID_ESTADO_PLANILLA
     WHERE pm.ID_PLANILLA_MENSUAL = p_id_planilla_mensual;
END$$

-- No-op silencioso si ya existe un detalle para este (planilla, contrato)
-- -- UQ_PD_PLANILLA_CONTRATO es el respaldo, este guard evita el error de
-- llave duplicada y deja reintentar "Generar planilla del mes" sin
-- problema.
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_AGREGAR(
    IN p_id_planilla_mensual INT UNSIGNED,
    IN p_id_contrato INT UNSIGNED,
    IN p_tipo_referencia VARCHAR(50),
    IN p_id_referencia INT UNSIGNED,
    IN p_monto_bruto DECIMAL(12,2),
    IN p_monto_aporte_pension DECIMAL(12,2),
    IN p_monto_retencion_renta DECIMAL(12,2),
    IN p_monto_essalud DECIMAL(12,2),
    IN p_monto_neto DECIMAL(12,2),
    IN p_id_sistema_pension_aplicado INT UNSIGNED,
    IN p_id_afp_fondo_aplicado INT UNSIGNED,
    IN p_id_parametro_aplicado INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_planilla_detalle INT UNSIGNED
)
BEGIN
    DECLARE v_id_pendiente INT UNSIGNED;
    SET v_id_pendiente = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_EMISION_PLANILLA_DETALLE' AND CODIGO = 'PENDIENTE' LIMIT 1);

    IF NOT EXISTS (
        SELECT 1 FROM RRHH_PLANILLA_DETALLE WHERE ID_PLANILLA_MENSUAL = p_id_planilla_mensual AND ID_CONTRATO = p_id_contrato
    ) THEN
        INSERT INTO RRHH_PLANILLA_DETALLE (
            ID_PLANILLA_MENSUAL, ID_CONTRATO, TIPO_REFERENCIA, ID_REFERENCIA,
            MONTO_BRUTO, MONTO_APORTE_PENSION, MONTO_RETENCION_RENTA, MONTO_ESSALUD, MONTO_NETO,
            ID_SISTEMA_PENSION_APLICADO, ID_AFP_FONDO_APLICADO, ID_PARAMETRO_APLICADO,
            CALCULO_AUTOMATICO, ID_ESTADO_EMISION, USUARIO_CREACION
        ) VALUES (
            p_id_planilla_mensual, p_id_contrato, p_tipo_referencia, p_id_referencia,
            p_monto_bruto, p_monto_aporte_pension, p_monto_retencion_renta, p_monto_essalud, p_monto_neto,
            p_id_sistema_pension_aplicado, p_id_afp_fondo_aplicado, p_id_parametro_aplicado,
            1, v_id_pendiente, p_id_usuario_creacion
        );

        SET p_id_planilla_detalle = LAST_INSERT_ID();
    END IF;
END$$

-- No-op silencioso si esa hora ya estaba vinculada a otro detalle
-- (UQ_PDH_HORAS es el respaldo).
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_HORAS_VINCULAR(
    IN p_id_planilla_detalle INT UNSIGNED,
    IN p_id_contrato_horas INT UNSIGNED
)
BEGIN
    INSERT INTO RRHH_PLANILLA_DETALLE_HORAS (ID_PLANILLA_DETALLE, ID_CONTRATO_HORAS)
    SELECT p_id_planilla_detalle, p_id_contrato_horas
     WHERE NOT EXISTS (SELECT 1 FROM RRHH_PLANILLA_DETALLE_HORAS WHERE ID_CONTRATO_HORAS = p_id_contrato_horas);
END$$

-- Desglose de horas que se sumaron en un detalle POR_HORA -- para el RxH
-- y la pantalla de detalle.
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_HORAS_LISTAR(
    IN p_id_planilla_detalle INT UNSIGNED
)
BEGIN
    SELECT h.ID_CONTRATO_HORAS, h.PERIODO, h.HORAS, h.MONTO_CALCULADO,
           py.NOMBRE AS PROYECTO_NOMBRE, cp.TARIFA_HORA
      FROM RRHH_PLANILLA_DETALLE_HORAS pdh
      JOIN RRHH_CONTRATO_HORAS h ON h.ID_CONTRATO_HORAS = pdh.ID_CONTRATO_HORAS
      JOIN RRHH_CONTRATO_PROYECTO cp ON cp.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
      JOIN PROYECTO py ON py.ID_PROYECTO = cp.ID_PROYECTO
     WHERE pdh.ID_PLANILLA_DETALLE = p_id_planilla_detalle
     ORDER BY h.PERIODO;
END$$

-- Grilla del mes: un colaborador por fila con su regimen y montos.
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_LISTAR(
    IN p_id_planilla_mensual INT UNSIGNED
)
BEGIN
    SELECT d.ID_PLANILLA_DETALLE, d.ID_PLANILLA_MENSUAL, d.ID_CONTRATO,
           u.ID_USUARIO, u.NOMBRES, u.APELLIDOS, c.CARGO,
           c.ID_TIPO_CONTRATO, tc.CODIGO AS TIPO_CONTRATO_CODIGO, tc.DESCRIPCION AS TIPO_CONTRATO_DESCRIPCION,
           c.ID_TIPO_PAGO_LOCADOR, tpl.CODIGO AS TIPO_PAGO_LOCADOR_CODIGO, tpl.DESCRIPCION AS TIPO_PAGO_LOCADOR_DESCRIPCION,
           d.MONTO_BRUTO, d.MONTO_APORTE_PENSION, d.MONTO_RETENCION_RENTA, d.MONTO_ESSALUD, d.MONTO_NETO,
           d.CALCULO_AUTOMATICO, d.AFP_ESSALUD_PAGADO,
           d.ID_ESTADO_EMISION, ee.CODIGO AS ESTADO_EMISION_CODIGO, ee.DESCRIPCION AS ESTADO_EMISION_DESCRIPCION,
           d.DOCUMENTO_PATH, d.FECHA_EMISION
      FROM RRHH_PLANILLA_DETALLE d
      JOIN RRHH_CONTRATO c ON c.ID_CONTRATO = d.ID_CONTRATO
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CONTRATO
      LEFT JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = c.ID_TIPO_PAGO_LOCADOR
      JOIN MAESTRO_MAESTRO ee ON ee.ID_MAESTRO = d.ID_ESTADO_EMISION
     WHERE d.ID_PLANILLA_MENSUAL = p_id_planilla_mensual
     ORDER BY u.APELLIDOS, u.NOMBRES;
END$$

-- Detalle completo de un colaborador para la pantalla de boleta/RxH:
-- datos de identidad, banco, pension/suspension vigente en RRHH_EMPLEADO
-- (no la foto guardada en el detalle -- esa es de cuando se calculo).
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_OBTENER(
    IN p_id_planilla_detalle INT UNSIGNED
)
BEGIN
    SELECT d.ID_PLANILLA_DETALLE, d.ID_PLANILLA_MENSUAL, pm.PERIODO, pm.ANIO, pm.MES,
           d.ID_CONTRATO, u.ID_USUARIO, u.NOMBRES, u.APELLIDOS, u.CORREO,
           c.CARGO, c.ID_TIPO_CONTRATO, tc.CODIGO AS TIPO_CONTRATO_CODIGO, tc.DESCRIPCION AS TIPO_CONTRATO_DESCRIPCION,
           c.ID_TIPO_PAGO_LOCADOR, tpl.CODIGO AS TIPO_PAGO_LOCADOR_CODIGO, tpl.DESCRIPCION AS TIPO_PAGO_LOCADOR_DESCRIPCION,
           c.NRO_CUENTA, c.CCI, c.BANCO,
           e.ID_TIPO_DOCUMENTO, td.DESCRIPCION AS TIPO_DOCUMENTO_DESCRIPCION, e.NRO_DOCUMENTO, e.DIRECCION,
           e.ID_SISTEMA_PENSION, sp.CODIGO AS SISTEMA_PENSION_CODIGO, sp.DESCRIPCION AS SISTEMA_PENSION_DESCRIPCION,
           e.ID_AFP_FONDO, af.CODIGO AS AFP_FONDO_CODIGO, af.DESCRIPCION AS AFP_FONDO_DESCRIPCION,
           e.SUSPENSION_RETENCION_4TA_HASTA,
           d.TIPO_REFERENCIA, d.ID_REFERENCIA,
           d.MONTO_BRUTO, d.MONTO_APORTE_PENSION, d.MONTO_RETENCION_RENTA, d.MONTO_ESSALUD, d.MONTO_NETO,
           d.CALCULO_AUTOMATICO, d.AFP_ESSALUD_PAGADO, d.FECHA_MARCADO_PAGADO,
           d.ID_ESTADO_EMISION, ee.CODIGO AS ESTADO_EMISION_CODIGO, ee.DESCRIPCION AS ESTADO_EMISION_DESCRIPCION,
           d.DOCUMENTO_PATH, d.FECHA_EMISION
      FROM RRHH_PLANILLA_DETALLE d
      JOIN RRHH_PLANILLA_MENSUAL pm ON pm.ID_PLANILLA_MENSUAL = d.ID_PLANILLA_MENSUAL
      JOIN RRHH_CONTRATO c ON c.ID_CONTRATO = d.ID_CONTRATO
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      LEFT JOIN RRHH_EMPLEADO e ON e.ID_USUARIO = u.ID_USUARIO
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CONTRATO
      LEFT JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = c.ID_TIPO_PAGO_LOCADOR
      LEFT JOIN MAESTRO_MAESTRO td ON td.ID_MAESTRO = e.ID_TIPO_DOCUMENTO
      LEFT JOIN MAESTRO_MAESTRO sp ON sp.ID_MAESTRO = e.ID_SISTEMA_PENSION
      LEFT JOIN MAESTRO_MAESTRO af ON af.ID_MAESTRO = e.ID_AFP_FONDO
      JOIN MAESTRO_MAESTRO ee ON ee.ID_MAESTRO = d.ID_ESTADO_EMISION
     WHERE d.ID_PLANILLA_DETALLE = p_id_planilla_detalle;
END$$

-- Editable solo mientras no esta EMITIDA -- no-op silencioso despues,
-- mismo criterio que SP_RRHH_CONTRATO_PERIODO_PAGO_ACTUALIZAR. p_calculo_automatico
-- lo decide la app (1 si viene de recalcular, 0 si un humano lo edito a mano).
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_ACTUALIZAR_MONTOS(
    IN p_id_planilla_detalle INT UNSIGNED,
    IN p_monto_bruto DECIMAL(12,2),
    IN p_monto_aporte_pension DECIMAL(12,2),
    IN p_monto_retencion_renta DECIMAL(12,2),
    IN p_monto_essalud DECIMAL(12,2),
    IN p_monto_neto DECIMAL(12,2),
    IN p_calculo_automatico TINYINT
)
BEGIN
    UPDATE RRHH_PLANILLA_DETALLE d
      JOIN MAESTRO_MAESTRO ee ON ee.ID_MAESTRO = d.ID_ESTADO_EMISION
       SET d.MONTO_BRUTO = p_monto_bruto,
           d.MONTO_APORTE_PENSION = p_monto_aporte_pension,
           d.MONTO_RETENCION_RENTA = p_monto_retencion_renta,
           d.MONTO_ESSALUD = p_monto_essalud,
           d.MONTO_NETO = p_monto_neto,
           d.CALCULO_AUTOMATICO = p_calculo_automatico
     WHERE d.ID_PLANILLA_DETALLE = p_id_planilla_detalle AND ee.CODIGO != 'EMITIDA';
END$$

-- AFP/EsSalud pagados a SUNAT es independiente de si ya se emitio la
-- boleta/RxH -- no se bloquea por ID_ESTADO_EMISION (RRHH puede marcar
-- el pago de aportes dias despues de emitir).
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_MARCAR_PAGADO(
    IN p_id_planilla_detalle INT UNSIGNED,
    IN p_pagado TINYINT,
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    UPDATE RRHH_PLANILLA_DETALLE
       SET AFP_ESSALUD_PAGADO = p_pagado, FECHA_MARCADO_PAGADO = NOW(), USUARIO_MARCADO_PAGADO = p_id_usuario
     WHERE ID_PLANILLA_DETALLE = p_id_planilla_detalle;
END$$

CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_MARCAR_PAGADO_MASIVO(
    IN p_id_planilla_mensual INT UNSIGNED,
    IN p_pagado TINYINT,
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    UPDATE RRHH_PLANILLA_DETALLE
       SET AFP_ESSALUD_PAGADO = p_pagado, FECHA_MARCADO_PAGADO = NOW(), USUARIO_MARCADO_PAGADO = p_id_usuario
     WHERE ID_PLANILLA_MENSUAL = p_id_planilla_mensual;
END$$

-- Se llama despues de que la app ya genero y guardo el PDF (mismo orden
-- que la firma de contratos: primero el archivo, despues persistir la
-- ruta) -- no-op silencioso si ya estaba EMITIDA (idempotente).
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_EMITIR(
    IN p_id_planilla_detalle INT UNSIGNED,
    IN p_documento_path VARCHAR(300),
    IN p_id_usuario_emision INT UNSIGNED
)
BEGIN
    DECLARE v_id_emitida INT UNSIGNED;
    SET v_id_emitida = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_EMISION_PLANILLA_DETALLE' AND CODIGO = 'EMITIDA' LIMIT 1);

    UPDATE RRHH_PLANILLA_DETALLE d
      JOIN MAESTRO_MAESTRO ee ON ee.ID_MAESTRO = d.ID_ESTADO_EMISION
       SET d.ID_ESTADO_EMISION = v_id_emitida, d.DOCUMENTO_PATH = p_documento_path,
           d.FECHA_EMISION = NOW(), d.USUARIO_EMISION = p_id_usuario_emision
     WHERE d.ID_PLANILLA_DETALLE = p_id_planilla_detalle AND ee.CODIGO != 'EMITIDA';
END$$

-- Cierra el header solo si ya no queda ningun detalle PENDIENTE -- no-op
-- silencioso en cualquier otro caso, mismo estilo que SP_PASIVO_CUOTA_MARCAR_PAGADA
-- cerrando el pasivo cuando ya no quedan cuotas pendientes.
CREATE PROCEDURE SP_RRHH_PLANILLA_MENSUAL_EMITIR(
    IN p_id_planilla_mensual INT UNSIGNED,
    IN p_id_usuario_emision INT UNSIGNED
)
BEGIN
    DECLARE v_id_emitida_planilla INT UNSIGNED;
    DECLARE v_quedan_pendientes INT;

    SELECT COUNT(*) INTO v_quedan_pendientes
      FROM RRHH_PLANILLA_DETALLE d
      JOIN MAESTRO_MAESTRO ee ON ee.ID_MAESTRO = d.ID_ESTADO_EMISION
     WHERE d.ID_PLANILLA_MENSUAL = p_id_planilla_mensual AND ee.CODIGO != 'EMITIDA';

    IF v_quedan_pendientes = 0 THEN
        SET v_id_emitida_planilla = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PLANILLA_MENSUAL' AND CODIGO = 'EMITIDA' LIMIT 1);
        UPDATE RRHH_PLANILLA_MENSUAL
           SET ID_ESTADO_PLANILLA = v_id_emitida_planilla, FECHA_EMISION = NOW(), USUARIO_EMISION = p_id_usuario_emision
         WHERE ID_PLANILLA_MENSUAL = p_id_planilla_mensual;
    END IF;
END$$

-- Solo mientras el detalle sigue PENDIENTE (para corregir, ej. un
-- contrato que no debia entrar este mes) -- borra primero el puente de
-- horas si lo tenia.
CREATE PROCEDURE SP_RRHH_PLANILLA_DETALLE_ELIMINAR(
    IN p_id_planilla_detalle INT UNSIGNED
)
BEGIN
    DECLARE v_puede_eliminar INT;

    SELECT COUNT(*) INTO v_puede_eliminar
      FROM RRHH_PLANILLA_DETALLE d
      JOIN MAESTRO_MAESTRO ee ON ee.ID_MAESTRO = d.ID_ESTADO_EMISION
     WHERE d.ID_PLANILLA_DETALLE = p_id_planilla_detalle AND ee.CODIGO != 'EMITIDA';

    IF v_puede_eliminar = 1 THEN
        DELETE FROM RRHH_PLANILLA_DETALLE_HORAS WHERE ID_PLANILLA_DETALLE = p_id_planilla_detalle;
        DELETE FROM RRHH_PLANILLA_DETALLE WHERE ID_PLANILLA_DETALLE = p_id_planilla_detalle;
    END IF;
END$$

DELIMITER ;
