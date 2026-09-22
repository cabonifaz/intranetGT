-- =====================================================================
-- Importacion de contratos ya firmados en papel (ver
-- 042_rrhh_contrato_importacion.sql). El mapeo de texto libre (tipo de
-- contrato, tipo de pago, moneda) a los ID_MAESTRO correspondientes ya
-- lo resuelve la capa de acciones antes de llamar estos procedimientos
-- (mismo criterio que SP_RRHH_CONTRATO_CREAR: aca solo se persiste).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_IMPORTACION_CREAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_IMPORTACION_OBTENER;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_IMPORTACION_CONFIRMAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_IMPORTACION_LISTAR_PENDIENTES;

DELIMITER $$

-- Crea el contrato directo en IMPORTADO_EN_REVISION (salta BORRADOR/
-- PENDIENTE_FIRMA) con lo que la OCR pudo leer -- campos nulos quedan
-- vacios para que la revision los complete, no se inventan valores.
-- DOCUMENTO_PATH ya es el escaneo firmado (a diferencia del flujo
-- normal, aca el documento firmado se conoce desde el arranque).
CREATE PROCEDURE SP_RRHH_CONTRATO_IMPORTACION_CREAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_id_tipo_contrato INT UNSIGNED,
    IN p_id_tipo_pago_locador INT UNSIGNED,
    IN p_cargo VARCHAR(100),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_dias_laborales VARCHAR(100),
    IN p_hora_inicio TIME,
    IN p_hora_fin TIME,
    IN p_tarifa DECIMAL(10,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_periodo_pago VARCHAR(100),
    IN p_nro_cuenta VARCHAR(30),
    IN p_cci VARCHAR(30),
    IN p_banco VARCHAR(60),
    IN p_documento_escaneado_path VARCHAR(300),
    IN p_datos_extraidos_json TEXT,
    IN p_advertencias_extraccion TEXT,
    IN p_id_usuario_carga INT UNSIGNED,
    OUT p_id_contrato INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_importado INT UNSIGNED;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_importado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONTRATO' AND CODIGO = 'IMPORTADO_EN_REVISION' LIMIT 1);

    INSERT INTO RRHH_CONTRATO (
        ID_USUARIO, ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, CARGO,
        FECHA_INICIO, FECHA_FIN, DIAS_LABORALES, HORA_INICIO, HORA_FIN,
        TARIFA, ID_MONEDA, TIPO_CAMBIO, PERIODO_PAGO, NRO_CUENTA, CCI, BANCO,
        DOCUMENTO_PATH, ID_ESTADO_CONTRATO, ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_id_usuario, p_id_tipo_contrato, p_id_tipo_pago_locador, p_cargo,
        p_fecha_inicio, p_fecha_fin, p_dias_laborales, p_hora_inicio, p_hora_fin,
        p_tarifa, p_id_moneda, p_tipo_cambio, p_periodo_pago, p_nro_cuenta, p_cci, p_banco,
        p_documento_escaneado_path, v_id_importado, v_id_activo, p_id_usuario_carga
    );

    SET p_id_contrato = LAST_INSERT_ID();

    INSERT INTO RRHH_CONTRATO_IMPORTACION (
        ID_CONTRATO, DOCUMENTO_ESCANEADO_PATH, DATOS_EXTRAIDOS_JSON, ADVERTENCIAS_EXTRACCION, USUARIO_CARGA
    ) VALUES (
        p_id_contrato, p_documento_escaneado_path, p_datos_extraidos_json, p_advertencias_extraccion, p_id_usuario_carga
    );
END$$

-- Detalle para la pantalla de revision: el contrato (con los campos que
-- pudo llenar la OCR) + la trazabilidad de la importacion.
CREATE PROCEDURE SP_RRHH_CONTRATO_IMPORTACION_OBTENER(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    SELECT c.ID_CONTRATO, c.ID_USUARIO, u.NOMBRES, u.APELLIDOS, u.CORREO,
           c.ID_TIPO_CONTRATO, tc.CODIGO AS TIPO_CONTRATO_CODIGO, tc.DESCRIPCION AS TIPO_CONTRATO_DESCRIPCION,
           c.ID_TIPO_PAGO_LOCADOR, tp.CODIGO AS TIPO_PAGO_LOCADOR_CODIGO, tp.DESCRIPCION AS TIPO_PAGO_LOCADOR_DESCRIPCION,
           c.CARGO, c.FECHA_INICIO, c.FECHA_FIN, c.DIAS_LABORALES, c.HORA_INICIO, c.HORA_FIN,
           c.TARIFA, c.ID_MONEDA, mo.CODIGO AS MONEDA_CODIGO, c.TIPO_CAMBIO, c.PERIODO_PAGO,
           c.NRO_CUENTA, c.CCI, c.BANCO,
           c.ID_ESTADO_CONTRATO, ec.CODIGO AS ESTADO_CONTRATO_CODIGO, ec.DESCRIPCION AS ESTADO_CONTRATO_DESCRIPCION,
           c.DOCUMENTO_PATH,
           ci.ID_IMPORTACION, ci.DOCUMENTO_ESCANEADO_PATH, ci.DATOS_EXTRAIDOS_JSON, ci.ADVERTENCIAS_EXTRACCION,
           ci.USUARIO_CARGA, ci.FECHA_CARGA, ci.USUARIO_CONFIRMACION, ci.FECHA_CONFIRMACION
      FROM RRHH_CONTRATO c
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CONTRATO
      LEFT JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = c.ID_TIPO_PAGO_LOCADOR
      LEFT JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = c.ID_MONEDA
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
      JOIN RRHH_CONTRATO_IMPORTACION ci ON ci.ID_CONTRATO = c.ID_CONTRATO
     WHERE c.ID_CONTRATO = p_id_contrato;
END$$

-- Pendientes de revisar (para el listado de contratos, o un badge de
-- aviso). No-op de listado simple, sin filtros.
CREATE PROCEDURE SP_RRHH_CONTRATO_IMPORTACION_LISTAR_PENDIENTES()
BEGIN
    SELECT c.ID_CONTRATO, u.NOMBRES, u.APELLIDOS, c.CARGO, ci.FECHA_CARGA,
           CONCAT(uc.NOMBRES, ' ', uc.APELLIDOS) AS CARGADO_POR
      FROM RRHH_CONTRATO c
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
      JOIN RRHH_CONTRATO_IMPORTACION ci ON ci.ID_CONTRATO = c.ID_CONTRATO
      JOIN USUARIO uc ON uc.ID_USUARIO = ci.USUARIO_CARGA
     WHERE ec.CODIGO = 'IMPORTADO_EN_REVISION'
     ORDER BY ci.FECHA_CARGA;
END$$

-- Confirmar = corregir lo que la OCR trajo mal (todos los campos son
-- reemplazados por lo que llega del formulario de revision, ya
-- corregido) y pasar a FIRMADO en el mismo paso -- de ahi en adelante el
-- contrato es indistinguible de uno firmado por el flujo normal (entra
-- a planilla, etc.). No-op silencioso si no estaba IMPORTADO_EN_REVISION
-- (evita reconfirmar dos veces o confirmar un contrato que no vino de
-- este flujo).
CREATE PROCEDURE SP_RRHH_CONTRATO_IMPORTACION_CONFIRMAR(
    IN p_id_contrato INT UNSIGNED,
    IN p_id_usuario INT UNSIGNED,
    IN p_id_tipo_contrato INT UNSIGNED,
    IN p_id_tipo_pago_locador INT UNSIGNED,
    IN p_cargo VARCHAR(100),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_dias_laborales VARCHAR(100),
    IN p_hora_inicio TIME,
    IN p_hora_fin TIME,
    IN p_tarifa DECIMAL(10,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_periodo_pago VARCHAR(100),
    IN p_nro_cuenta VARCHAR(30),
    IN p_cci VARCHAR(30),
    IN p_banco VARCHAR(60),
    IN p_fecha_firma DATETIME,
    IN p_id_usuario_confirmacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_firmado INT UNSIGNED;
    SET v_id_firmado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONTRATO' AND CODIGO = 'FIRMADO' LIMIT 1);

    UPDATE RRHH_CONTRATO c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
       SET c.ID_USUARIO = p_id_usuario,
           c.ID_TIPO_CONTRATO = p_id_tipo_contrato,
           c.ID_TIPO_PAGO_LOCADOR = p_id_tipo_pago_locador,
           c.CARGO = p_cargo,
           c.FECHA_INICIO = p_fecha_inicio,
           c.FECHA_FIN = p_fecha_fin,
           c.DIAS_LABORALES = p_dias_laborales,
           c.HORA_INICIO = p_hora_inicio,
           c.HORA_FIN = p_hora_fin,
           c.TARIFA = p_tarifa,
           c.ID_MONEDA = p_id_moneda,
           c.TIPO_CAMBIO = p_tipo_cambio,
           c.PERIODO_PAGO = p_periodo_pago,
           c.NRO_CUENTA = p_nro_cuenta,
           c.CCI = p_cci,
           c.BANCO = p_banco,
           c.FECHA_FIRMA = COALESCE(p_fecha_firma, NOW()),
           c.ID_ESTADO_CONTRATO = v_id_firmado
     WHERE c.ID_CONTRATO = p_id_contrato AND ec.CODIGO = 'IMPORTADO_EN_REVISION';

    UPDATE RRHH_CONTRATO_IMPORTACION ci
      JOIN RRHH_CONTRATO c ON c.ID_CONTRATO = ci.ID_CONTRATO
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
       SET ci.USUARIO_CONFIRMACION = p_id_usuario_confirmacion, ci.FECHA_CONFIRMACION = NOW()
     WHERE ci.ID_CONTRATO = p_id_contrato AND ec.CODIGO = 'FIRMADO' AND ci.USUARIO_CONFIRMACION IS NULL;
END$$

DELIMITER ;
