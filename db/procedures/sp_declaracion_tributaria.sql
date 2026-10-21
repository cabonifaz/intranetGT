-- =====================================================================
-- Procedimientos del modulo de impuestos: CRUD de DECLARACION_TRIBUTARIA
-- y su ciclo de vida BORRADOR -> PRESENTADA -> PAGADA (o ANULADA).
--
-- El pago y el registro de saldo a favor NO se hacen en una sola SP:
-- se llama primero SP_CUENTA_MOVIMIENTO_REGISTRAR (que abre su propia
-- transaccion) desde la capa de aplicacion, y con el ID_MOVIMIENTO
-- resultante se llama SP_DECLARACION_TRIBUTARIA_PRESENTAR/_MARCAR_PAGADA
-- -- mismo patron (y mismo riesgo aceptado) que ya usa Pasivos, ver nota
-- al inicio de sp_pasivo.sql.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_CREAR;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_OBTENER;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_LISTAR;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_LISTAR_PENDIENTES_VENCIMIENTO;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_SUBIR_DOCUMENTO;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_PRESENTAR;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_MARCAR_PAGADA;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_ANULAR;
DROP PROCEDURE IF EXISTS SP_DECLARACION_TRIBUTARIA_ELIMINAR;

DELIMITER $$

-- Idempotente por periodo: UQ_DECLARACION_PERIODO (ID_TIPO_DECLARACION,
-- ANIO, MES) -- si ya existe, no-op silencioso (p_id_declaracion queda
-- NULL), mismo criterio que SP_PROYECTO_CONFORMIDAD_CREAR.
CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_CREAR(
    IN p_id_tipo_declaracion INT UNSIGNED,
    IN p_anio SMALLINT UNSIGNED,
    IN p_mes TINYINT UNSIGNED,
    IN p_fecha_vencimiento DATE,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_declaracion INT UNSIGNED
)
BEGIN
    DECLARE v_id_borrador INT UNSIGNED;
    DECLARE v_existe INT;
    SET v_id_borrador = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_DECLARACION_TRIBUTARIA' AND CODIGO = 'BORRADOR' LIMIT 1);

    SELECT COUNT(*) INTO v_existe
      FROM DECLARACION_TRIBUTARIA
     WHERE ID_TIPO_DECLARACION = p_id_tipo_declaracion AND ANIO = p_anio AND MES = p_mes;

    IF v_existe = 0 THEN
        INSERT INTO DECLARACION_TRIBUTARIA (
            ID_TIPO_DECLARACION, ANIO, MES, FECHA_VENCIMIENTO, ID_ESTADO_DECLARACION, USUARIO_CREACION
        ) VALUES (
            p_id_tipo_declaracion, p_anio, p_mes, p_fecha_vencimiento, v_id_borrador, p_id_usuario_creacion
        );
        SET p_id_declaracion = LAST_INSERT_ID();
    ELSE
        SELECT ID_DECLARACION INTO p_id_declaracion
          FROM DECLARACION_TRIBUTARIA
         WHERE ID_TIPO_DECLARACION = p_id_tipo_declaracion AND ANIO = p_anio AND MES = p_mes;
    END IF;
END$$

-- Solo mientras BORRADOR -- no-op silencioso si no (no afecta filas).
-- Todos los montos opcionales (NULL si no aplican al tipo).
CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_ACTUALIZAR(
    IN p_id_declaracion INT UNSIGNED,
    IN p_fecha_vencimiento DATE,
    IN p_ventas_gravadas DECIMAL(14,2),
    IN p_compras_gravadas DECIMAL(14,2),
    IN p_igv_ventas DECIMAL(14,2),
    IN p_igv_compras DECIMAL(14,2),
    IN p_igv_resultante DECIMAL(14,2),
    IN p_pago_a_cuenta_renta DECIMAL(14,2),
    IN p_impuesto_calculado_renta DECIMAL(14,2),
    IN p_pagos_a_cuenta_acumulados DECIMAL(14,2),
    IN p_saldo_renta DECIMAL(14,2),
    IN p_monto_total_a_pagar DECIMAL(14,2),
    IN p_notas VARCHAR(500),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
       SET d.FECHA_VENCIMIENTO = p_fecha_vencimiento,
           d.VENTAS_GRAVADAS = p_ventas_gravadas,
           d.COMPRAS_GRAVADAS = p_compras_gravadas,
           d.IGV_VENTAS = p_igv_ventas,
           d.IGV_COMPRAS = p_igv_compras,
           d.IGV_RESULTANTE = p_igv_resultante,
           d.PAGO_A_CUENTA_RENTA = p_pago_a_cuenta_renta,
           d.IMPUESTO_CALCULADO_RENTA = p_impuesto_calculado_renta,
           d.PAGOS_A_CUENTA_ACUMULADOS = p_pagos_a_cuenta_acumulados,
           d.SALDO_RENTA = p_saldo_renta,
           d.MONTO_TOTAL_A_PAGAR = p_monto_total_a_pagar,
           d.NOTAS = p_notas,
           d.USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE d.ID_DECLARACION = p_id_declaracion
       AND e.CODIGO = 'BORRADOR';
END$$

CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_OBTENER(
    IN p_id_declaracion INT UNSIGNED
)
BEGIN
    SELECT d.*, t.CODIGO AS TIPO_DECLARACION_CODIGO, t.DESCRIPCION AS TIPO_DECLARACION_DESCRIPCION,
           e.CODIGO AS ESTADO_DECLARACION_CODIGO, e.DESCRIPCION AS ESTADO_DECLARACION_DESCRIPCION,
           c.NOMBRE AS CUENTA_PAGO_NOMBRE
      FROM DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO t ON t.ID_MAESTRO = d.ID_TIPO_DECLARACION
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
      LEFT JOIN CUENTA_EMPRESA c ON c.ID_CUENTA = d.ID_CUENTA_PAGO
     WHERE d.ID_DECLARACION = p_id_declaracion;
END$$

CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_LISTAR(
    IN p_id_tipo_declaracion INT UNSIGNED,
    IN p_anio SMALLINT UNSIGNED
)
BEGIN
    SELECT d.ID_DECLARACION, d.ID_TIPO_DECLARACION, t.CODIGO AS TIPO_DECLARACION_CODIGO, t.DESCRIPCION AS TIPO_DECLARACION_DESCRIPCION,
           d.ANIO, d.MES, d.FECHA_VENCIMIENTO, d.MONTO_TOTAL_A_PAGAR,
           d.ID_ESTADO_DECLARACION, e.CODIGO AS ESTADO_DECLARACION_CODIGO, e.DESCRIPCION AS ESTADO_DECLARACION_DESCRIPCION,
           d.FECHA_PRESENTACION, d.FECHA_PAGO
      FROM DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO t ON t.ID_MAESTRO = d.ID_TIPO_DECLARACION
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
     WHERE (p_id_tipo_declaracion IS NULL OR d.ID_TIPO_DECLARACION = p_id_tipo_declaracion)
       AND (p_anio IS NULL OR d.ANIO = p_anio)
     ORDER BY d.ANIO DESC, d.MES DESC;
END$$

-- Alimenta el cron de alertas: BORRADOR a punto de vencer su fecha de
-- presentacion, o PRESENTADA con un monto pendiente de pago a punto de
-- vencer -- mismo p_dias_alerta para ambos casos, misma fecha de SUNAT
-- para presentar y pagar.
CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_LISTAR_PENDIENTES_VENCIMIENTO(
    IN p_dias_alerta INT
)
BEGIN
    SELECT d.ID_DECLARACION, t.DESCRIPCION AS TIPO_DECLARACION_DESCRIPCION, d.ANIO, d.MES,
           d.FECHA_VENCIMIENTO, d.MONTO_TOTAL_A_PAGAR, e.CODIGO AS ESTADO_DECLARACION_CODIGO
      FROM DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO t ON t.ID_MAESTRO = d.ID_TIPO_DECLARACION
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
     WHERE d.FECHA_VENCIMIENTO BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL p_dias_alerta DAY)
       AND (
             e.CODIGO = 'BORRADOR'
          OR (e.CODIGO = 'PRESENTADA' AND d.MONTO_TOTAL_A_PAGAR > 0)
           )
     ORDER BY d.FECHA_VENCIMIENTO;
END$$

CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_SUBIR_DOCUMENTO(
    IN p_id_declaracion INT UNSIGNED,
    IN p_documento_path VARCHAR(300),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE DECLARACION_TRIBUTARIA
       SET DOCUMENTO_PATH = p_documento_path, USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_DECLARACION = p_id_declaracion;
END$$

-- Guard: solo BORRADOR. p_id_movimiento_credito viene ya registrado
-- (INGRESO en IGV_FAVOR/RENTA_FAVOR) por la capa de aplicacion solo si
-- el periodo genero saldo a favor -- NULL si no corresponde.
CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_PRESENTAR(
    IN p_id_declaracion INT UNSIGNED,
    IN p_id_movimiento_credito INT UNSIGNED
)
BEGIN
    DECLARE v_id_presentada INT UNSIGNED;
    SET v_id_presentada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_DECLARACION_TRIBUTARIA' AND CODIGO = 'PRESENTADA' LIMIT 1);

    UPDATE DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
       SET d.ID_ESTADO_DECLARACION = v_id_presentada,
           d.FECHA_PRESENTACION = NOW(),
           d.ID_MOVIMIENTO_CREDITO = p_id_movimiento_credito
     WHERE d.ID_DECLARACION = p_id_declaracion
       AND e.CODIGO = 'BORRADOR';
END$$

-- Se llama despues de SP_CUENTA_MOVIMIENTO_REGISTRAR (ver nota al inicio
-- del archivo). Guard idempotente: si ya esta PAGADA, no-op (permite
-- reintentar sin duplicar el efecto) -- mismo criterio que
-- SP_PASIVO_CUOTA_MARCAR_PAGADA. Solo aplica si PRESENTADA.
CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_MARCAR_PAGADA(
    IN p_id_declaracion INT UNSIGNED,
    IN p_id_movimiento_pago INT UNSIGNED,
    IN p_id_cuenta_pago INT UNSIGNED,
    IN p_fecha_pago DATETIME
)
BEGIN
    DECLARE v_id_pagada INT UNSIGNED;
    SET v_id_pagada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_DECLARACION_TRIBUTARIA' AND CODIGO = 'PAGADA' LIMIT 1);

    UPDATE DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
       SET d.ID_ESTADO_DECLARACION = v_id_pagada,
           d.ID_MOVIMIENTO_PAGO = p_id_movimiento_pago,
           d.ID_CUENTA_PAGO = p_id_cuenta_pago,
           d.FECHA_PAGO = p_fecha_pago
     WHERE d.ID_DECLARACION = p_id_declaracion
       AND e.CODIGO = 'PRESENTADA';
END$$

-- Guard: nunca si ya PAGADA (no se puede anular un pago ya hecho).
CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_ANULAR(
    IN p_id_declaracion INT UNSIGNED,
    IN p_motivo VARCHAR(300),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_anulada INT UNSIGNED;
    SET v_id_anulada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_DECLARACION_TRIBUTARIA' AND CODIGO = 'ANULADA' LIMIT 1);

    UPDATE DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
       SET d.ID_ESTADO_DECLARACION = v_id_anulada,
           d.MOTIVO_ANULACION = p_motivo,
           d.USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE d.ID_DECLARACION = p_id_declaracion
       AND e.CODIGO != 'PAGADA';
END$$

-- Guard: solo BORRADOR (una vez presentada queda como historial, se
-- anula en vez de borrarse).
CREATE PROCEDURE SP_DECLARACION_TRIBUTARIA_ELIMINAR(
    IN p_id_declaracion INT UNSIGNED
)
BEGIN
    DELETE d FROM DECLARACION_TRIBUTARIA d
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = d.ID_ESTADO_DECLARACION
     WHERE d.ID_DECLARACION = p_id_declaracion AND e.CODIGO = 'BORRADOR';
END$$

DELIMITER ;
