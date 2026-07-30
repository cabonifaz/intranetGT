-- =====================================================================
-- Procedimientos del modulo de cuentas: CRUD de CUENTA_EMPRESA y libro
-- de movimientos (CUENTA_MOVIMIENTO) con calculo de saldo.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_CUENTA_CREAR;
DROP PROCEDURE IF EXISTS SP_CUENTA_LISTAR;
DROP PROCEDURE IF EXISTS SP_CUENTA_OBTENER;
DROP PROCEDURE IF EXISTS SP_CUENTA_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_CUENTA_CAMBIAR_ESTADO;
DROP PROCEDURE IF EXISTS SP_CUENTA_MOVIMIENTO_REGISTRAR;
DROP PROCEDURE IF EXISTS SP_CUENTA_MOVIMIENTO_LISTAR;
DROP PROCEDURE IF EXISTS SP_CUENTA_MOVIMIENTO_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_CUENTA_MOVIMIENTO_LISTAR_POR_REFERENCIA;

DELIMITER $$

-- p_id_banco/p_id_moneda/p_nro_cuenta/p_cci solo aplican a cuentas
-- BANCARIA/DETRACCIONES -- IGV_FAVOR/RENTA_FAVOR se crean con estos en
-- NULL, son solo un saldo.
CREATE PROCEDURE SP_CUENTA_CREAR(
    IN p_id_tipo_cuenta INT UNSIGNED,
    IN p_id_banco INT UNSIGNED,
    IN p_id_moneda INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_nro_cuenta VARCHAR(40),
    IN p_cci VARCHAR(30),
    IN p_saldo_inicial DECIMAL(14,2),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_cuenta INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO CUENTA_EMPRESA (
        ID_TIPO_CUENTA, ID_BANCO, ID_MONEDA, NOMBRE, NRO_CUENTA, CCI,
        SALDO_INICIAL, SALDO_ACTUAL, ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_id_tipo_cuenta, p_id_banco, p_id_moneda, p_nombre, p_nro_cuenta, p_cci,
        p_saldo_inicial, p_saldo_inicial, v_id_activo, p_id_usuario_creacion
    );

    SET p_id_cuenta = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_CUENTA_LISTAR(
    IN p_id_tipo_cuenta INT UNSIGNED,
    IN p_solo_activas TINYINT
)
BEGIN
    SELECT c.ID_CUENTA, c.NOMBRE, c.NRO_CUENTA, c.SALDO_ACTUAL,
           c.ID_TIPO_CUENTA, tc.CODIGO AS TIPO_CUENTA_CODIGO, tc.DESCRIPCION AS TIPO_CUENTA_DESCRIPCION,
           c.ID_BANCO, b.DESCRIPCION AS BANCO_DESCRIPCION,
           c.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION,
           c.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM CUENTA_EMPRESA c
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CUENTA
      LEFT JOIN MAESTRO_MAESTRO b ON b.ID_MAESTRO = c.ID_BANCO
      LEFT JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = c.ID_MONEDA
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = c.ID_ESTADO
     WHERE (p_id_tipo_cuenta IS NULL OR c.ID_TIPO_CUENTA = p_id_tipo_cuenta)
       AND (p_solo_activas = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY tc.ORDEN, c.NOMBRE;
END$$

CREATE PROCEDURE SP_CUENTA_OBTENER(
    IN p_id_cuenta INT UNSIGNED
)
BEGIN
    SELECT c.ID_CUENTA, c.NOMBRE, c.NRO_CUENTA, c.CCI, c.SALDO_INICIAL, c.SALDO_ACTUAL,
           c.ID_TIPO_CUENTA, tc.CODIGO AS TIPO_CUENTA_CODIGO, tc.DESCRIPCION AS TIPO_CUENTA_DESCRIPCION,
           c.ID_BANCO, b.DESCRIPCION AS BANCO_DESCRIPCION,
           c.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION,
           c.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM CUENTA_EMPRESA c
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CUENTA
      LEFT JOIN MAESTRO_MAESTRO b ON b.ID_MAESTRO = c.ID_BANCO
      LEFT JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = c.ID_MONEDA
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = c.ID_ESTADO
     WHERE c.ID_CUENTA = p_id_cuenta;
END$$

-- El tipo de cuenta, banco y moneda no se editan una vez creada (cambiar
-- de moneda a mitad de un libro de movimientos no tendria sentido) --
-- solo nombre/numero/cci, que son datos administrativos.
CREATE PROCEDURE SP_CUENTA_ACTUALIZAR(
    IN p_id_cuenta INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_nro_cuenta VARCHAR(40),
    IN p_cci VARCHAR(30),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE CUENTA_EMPRESA
       SET NOMBRE = p_nombre,
           NRO_CUENTA = p_nro_cuenta,
           CCI = p_cci,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_CUENTA = p_id_cuenta;
END$$

CREATE PROCEDURE SP_CUENTA_CAMBIAR_ESTADO(
    IN p_id_cuenta INT UNSIGNED,
    IN p_activo TINYINT,
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_estado INT UNSIGNED;
    SET v_id_estado = (
        SELECT ID_MAESTRO FROM MAESTRO_MAESTRO
         WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = IF(p_activo = 1, 'ACTIVO', 'INACTIVO')
         LIMIT 1
    );

    UPDATE CUENTA_EMPRESA
       SET ID_ESTADO = v_id_estado,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_CUENTA = p_id_cuenta;
END$$

-- El saldo se recalcula aqui mismo (nunca se recibe desde la app): se
-- bloquea la fila de CUENTA_EMPRESA (FOR UPDATE) para que dos movimientos
-- concurrentes sobre la misma cuenta no lean el mismo saldo de partida.
CREATE PROCEDURE SP_CUENTA_MOVIMIENTO_REGISTRAR(
    IN p_id_cuenta INT UNSIGNED,
    IN p_id_tipo_movimiento INT UNSIGNED,
    IN p_fecha_movimiento DATE,
    IN p_monto DECIMAL(14,2),
    IN p_concepto VARCHAR(250),
    IN p_tipo_referencia VARCHAR(50),
    IN p_id_referencia INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_movimiento INT UNSIGNED,
    OUT p_saldo_resultante DECIMAL(14,2)
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_codigo_tipo VARCHAR(50);
    DECLARE v_saldo_actual DECIMAL(14,2);
    DECLARE v_signo INT;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_codigo_tipo = (SELECT CODIGO FROM MAESTRO_MAESTRO WHERE ID_MAESTRO = p_id_tipo_movimiento LIMIT 1);
    SET v_signo = IF(v_codigo_tipo = 'EGRESO', -1, 1);

    START TRANSACTION;

    SELECT SALDO_ACTUAL INTO v_saldo_actual FROM CUENTA_EMPRESA WHERE ID_CUENTA = p_id_cuenta FOR UPDATE;
    SET p_saldo_resultante = v_saldo_actual + (v_signo * p_monto);

    INSERT INTO CUENTA_MOVIMIENTO (
        ID_CUENTA, ID_TIPO_MOVIMIENTO, FECHA_MOVIMIENTO, MONTO, CONCEPTO,
        TIPO_REFERENCIA, ID_REFERENCIA, SALDO_RESULTANTE, ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_id_cuenta, p_id_tipo_movimiento, p_fecha_movimiento, p_monto, p_concepto,
        p_tipo_referencia, p_id_referencia, p_saldo_resultante, v_id_activo, p_id_usuario_creacion
    );
    SET p_id_movimiento = LAST_INSERT_ID();

    UPDATE CUENTA_EMPRESA
       SET SALDO_ACTUAL = p_saldo_resultante, USUARIO_MODIFICACION = p_id_usuario_creacion
     WHERE ID_CUENTA = p_id_cuenta;

    COMMIT;
END$$

CREATE PROCEDURE SP_CUENTA_MOVIMIENTO_LISTAR(
    IN p_id_cuenta INT UNSIGNED
)
BEGIN
    SELECT mv.ID_MOVIMIENTO, mv.ID_CUENTA, mv.FECHA_MOVIMIENTO, mv.MONTO, mv.CONCEPTO,
           mv.TIPO_REFERENCIA, mv.ID_REFERENCIA, mv.SALDO_RESULTANTE, mv.FECHA_CREACION,
           t.CODIGO AS TIPO_MOVIMIENTO_CODIGO, t.DESCRIPCION AS TIPO_MOVIMIENTO_DESCRIPCION
      FROM CUENTA_MOVIMIENTO mv
      JOIN MAESTRO_MAESTRO t ON t.ID_MAESTRO = mv.ID_TIPO_MOVIMIENTO
     WHERE mv.ID_CUENTA = p_id_cuenta
     ORDER BY mv.FECHA_MOVIMIENTO DESC, mv.ID_MOVIMIENTO DESC;
END$$

-- Solo se permite borrar el movimiento mas reciente de la cuenta (el de
-- mayor ID_MOVIMIENTO activo): cada SALDO_RESULTANTE depende del anterior,
-- borrar uno de en medio dejaria la cadena de saldos inconsistente. Si no
-- es el ultimo, no-op silencioso (mismo patron que otras salvaguardas del
-- sistema, ej. SP_USUARIO_ROL_REVOCAR).
CREATE PROCEDURE SP_CUENTA_MOVIMIENTO_ELIMINAR(
    IN p_id_movimiento INT UNSIGNED
)
BEGIN
    DECLARE v_id_cuenta INT UNSIGNED;
    DECLARE v_hay_posteriores INT;
    DECLARE v_saldo_anterior DECIMAL(14,2);

    SELECT ID_CUENTA INTO v_id_cuenta FROM CUENTA_MOVIMIENTO WHERE ID_MOVIMIENTO = p_id_movimiento;

    SELECT COUNT(*) INTO v_hay_posteriores
      FROM CUENTA_MOVIMIENTO
     WHERE ID_CUENTA = v_id_cuenta AND ID_MOVIMIENTO > p_id_movimiento;

    IF v_hay_posteriores = 0 THEN
        START TRANSACTION;

        SELECT COALESCE(
            (SELECT SALDO_RESULTANTE FROM CUENTA_MOVIMIENTO
              WHERE ID_CUENTA = v_id_cuenta AND ID_MOVIMIENTO < p_id_movimiento
              ORDER BY ID_MOVIMIENTO DESC LIMIT 1),
            (SELECT SALDO_INICIAL FROM CUENTA_EMPRESA WHERE ID_CUENTA = v_id_cuenta)
        ) INTO v_saldo_anterior;

        UPDATE CUENTA_EMPRESA SET SALDO_ACTUAL = v_saldo_anterior WHERE ID_CUENTA = v_id_cuenta;
        DELETE FROM CUENTA_MOVIMIENTO WHERE ID_MOVIMIENTO = p_id_movimiento;

        COMMIT;
    END IF;
END$$

-- Historial de pagos de un origen puntual (una cuota de pasivo, una
-- compra, un contrato) sin escanear el libro completo de una cuenta --
-- usa el indice IX_MOVIMIENTO_REFERENCIA agregado en 016_pasivos.sql.
CREATE PROCEDURE SP_CUENTA_MOVIMIENTO_LISTAR_POR_REFERENCIA(
    IN p_tipo_referencia VARCHAR(50),
    IN p_id_referencia INT UNSIGNED
)
BEGIN
    SELECT mv.ID_MOVIMIENTO, mv.ID_CUENTA, mv.FECHA_MOVIMIENTO, mv.MONTO, mv.CONCEPTO,
           mv.TIPO_REFERENCIA, mv.ID_REFERENCIA, mv.SALDO_RESULTANTE, mv.FECHA_CREACION,
           t.CODIGO AS TIPO_MOVIMIENTO_CODIGO, t.DESCRIPCION AS TIPO_MOVIMIENTO_DESCRIPCION
      FROM CUENTA_MOVIMIENTO mv
      JOIN MAESTRO_MAESTRO t ON t.ID_MAESTRO = mv.ID_TIPO_MOVIMIENTO
     WHERE mv.TIPO_REFERENCIA = p_tipo_referencia AND mv.ID_REFERENCIA = p_id_referencia
     ORDER BY mv.FECHA_MOVIMIENTO DESC, mv.ID_MOVIMIENTO DESC;
END$$

DELIMITER ;
