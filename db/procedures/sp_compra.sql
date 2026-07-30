-- =====================================================================
-- Procedimientos del modulo de compras: CRUD de PROVEEDOR, CRUD de
-- COMPRA y registro de pagos parciales (COMPRA_PAGO).
--
-- Igual que en Pasivos, el pago de una compra se hace en dos pasos desde
-- la capa de aplicacion: primero SP_CUENTA_MOVIMIENTO_REGISTRAR (que
-- abre su propia transaccion), y con el ID_MOVIMIENTO resultante se
-- llama SP_COMPRA_PAGO_REGISTRAR.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_PROVEEDOR_CREAR;
DROP PROCEDURE IF EXISTS SP_PROVEEDOR_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROVEEDOR_LISTAR_PERSONA_NATURAL;
DROP PROCEDURE IF EXISTS SP_PROVEEDOR_OBTENER;
DROP PROCEDURE IF EXISTS SP_PROVEEDOR_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_PROVEEDOR_CAMBIAR_ESTADO;
DROP PROCEDURE IF EXISTS SP_COMPRA_CREAR;
DROP PROCEDURE IF EXISTS SP_COMPRA_LISTAR;
DROP PROCEDURE IF EXISTS SP_COMPRA_OBTENER;
DROP PROCEDURE IF EXISTS SP_COMPRA_PAGO_REGISTRAR;
DROP PROCEDURE IF EXISTS SP_COMPRA_PAGO_LISTAR;
DROP PROCEDURE IF EXISTS SP_COMPRA_LISTAR_PENDIENTES;

DELIMITER $$

CREATE PROCEDURE SP_PROVEEDOR_CREAR(
    IN p_ruc VARCHAR(11),
    IN p_razon_social VARCHAR(150),
    IN p_es_persona_natural TINYINT,
    IN p_nombre_contacto VARCHAR(100),
    IN p_telefono VARCHAR(20),
    IN p_correo VARCHAR(100),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_proveedor INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO PROVEEDOR (
        RUC, RAZON_SOCIAL, ES_PERSONA_NATURAL, NOMBRE_CONTACTO, TELEFONO, CORREO, ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_ruc, p_razon_social, p_es_persona_natural, p_nombre_contacto, p_telefono, p_correo, v_id_activo, p_id_usuario_creacion
    );

    SET p_id_proveedor = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_PROVEEDOR_LISTAR(
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT pr.ID_PROVEEDOR, pr.RUC, pr.RAZON_SOCIAL, pr.ES_PERSONA_NATURAL, pr.NOMBRE_CONTACTO, pr.TELEFONO, pr.CORREO,
           pr.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM PROVEEDOR pr
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pr.ID_ESTADO
     WHERE (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY pr.RAZON_SOCIAL;
END$$

-- Bolsa de "persona" para mano de obra manual en Proyectos -- solo
-- proveedores activos marcados como persona natural (freelance/tecnico
-- independiente), nunca proveedores-empresa.
CREATE PROCEDURE SP_PROVEEDOR_LISTAR_PERSONA_NATURAL()
BEGIN
    SELECT pr.ID_PROVEEDOR, pr.RUC, pr.RAZON_SOCIAL, pr.ES_PERSONA_NATURAL, pr.NOMBRE_CONTACTO, pr.TELEFONO, pr.CORREO,
           pr.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM PROVEEDOR pr
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pr.ID_ESTADO
     WHERE e.CODIGO = 'ACTIVO' AND pr.ES_PERSONA_NATURAL = 1
     ORDER BY pr.RAZON_SOCIAL;
END$$

CREATE PROCEDURE SP_PROVEEDOR_OBTENER(
    IN p_id_proveedor INT UNSIGNED
)
BEGIN
    SELECT pr.ID_PROVEEDOR, pr.RUC, pr.RAZON_SOCIAL, pr.ES_PERSONA_NATURAL, pr.NOMBRE_CONTACTO, pr.TELEFONO, pr.CORREO,
           pr.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM PROVEEDOR pr
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pr.ID_ESTADO
     WHERE pr.ID_PROVEEDOR = p_id_proveedor;
END$$

CREATE PROCEDURE SP_PROVEEDOR_ACTUALIZAR(
    IN p_id_proveedor INT UNSIGNED,
    IN p_ruc VARCHAR(11),
    IN p_razon_social VARCHAR(150),
    IN p_es_persona_natural TINYINT,
    IN p_nombre_contacto VARCHAR(100),
    IN p_telefono VARCHAR(20),
    IN p_correo VARCHAR(100),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE PROVEEDOR
       SET RUC = p_ruc,
           RAZON_SOCIAL = p_razon_social,
           ES_PERSONA_NATURAL = p_es_persona_natural,
           NOMBRE_CONTACTO = p_nombre_contacto,
           TELEFONO = p_telefono,
           CORREO = p_correo,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_PROVEEDOR = p_id_proveedor;
END$$

CREATE PROCEDURE SP_PROVEEDOR_CAMBIAR_ESTADO(
    IN p_id_proveedor INT UNSIGNED,
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

    UPDATE PROVEEDOR
       SET ID_ESTADO = v_id_estado,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_PROVEEDOR = p_id_proveedor;
END$$

-- p_tipo_cambio: obligatorio SOLO si la compra esta enlazada a un
-- proyecto (p_id_proyecto) cuya moneda es distinta a p_id_moneda --
-- no-op silencioso si falta, mismo estilo del resto del sistema. Una
-- compra sin proyecto, o en la misma moneda del proyecto, no lo necesita
-- (se guarda NULL). Ver 031_tipo_cambio_proyecto.sql.
CREATE PROCEDURE SP_COMPRA_CREAR(
    IN p_id_proveedor INT UNSIGNED,
    IN p_id_proyecto INT UNSIGNED,
    IN p_descripcion VARCHAR(300),
    IN p_nro_documento VARCHAR(30),
    IN p_fecha_compra DATE,
    IN p_fecha_vencimiento DATE,
    IN p_monto_total DECIMAL(14,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_compra INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_pendiente INT UNSIGNED;
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_requiere_tc TINYINT;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_pendiente = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_COMPRA' AND CODIGO = 'PENDIENTE_PAGO' LIMIT 1);
    SET v_requiere_tc = 0;

    IF p_id_proyecto IS NOT NULL THEN
        SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
        IF p_id_moneda != v_id_moneda_proyecto THEN
            SET v_requiere_tc = 1;
        END IF;
    END IF;

    IF NOT (v_requiere_tc = 1 AND p_tipo_cambio IS NULL) THEN
        INSERT INTO COMPRA (
            ID_PROVEEDOR, ID_PROYECTO, DESCRIPCION, NRO_DOCUMENTO, FECHA_COMPRA, FECHA_VENCIMIENTO,
            MONTO_TOTAL, ID_MONEDA, TIPO_CAMBIO, ID_ESTADO_COMPRA, ID_ESTADO, USUARIO_CREACION
        ) VALUES (
            p_id_proveedor, p_id_proyecto, p_descripcion, p_nro_documento, p_fecha_compra, p_fecha_vencimiento,
            p_monto_total, p_id_moneda, IF(v_requiere_tc = 1, p_tipo_cambio, NULL), v_id_pendiente, v_id_activo, p_id_usuario_creacion
        );

        SET p_id_compra = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_COMPRA_LISTAR(
    IN p_id_estado_compra INT UNSIGNED,
    IN p_id_proveedor INT UNSIGNED,
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    SELECT c.ID_COMPRA, c.DESCRIPCION, c.NRO_DOCUMENTO, c.FECHA_COMPRA, c.FECHA_VENCIMIENTO,
           c.MONTO_TOTAL, c.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, c.TIPO_CAMBIO,
           c.ID_PROVEEDOR, pr.RAZON_SOCIAL AS PROVEEDOR_RAZON_SOCIAL,
           c.ID_PROYECTO,
           c.ID_ESTADO_COMPRA, ec.CODIGO AS ESTADO_COMPRA_CODIGO, ec.DESCRIPCION AS ESTADO_COMPRA_DESCRIPCION,
           COALESCE((SELECT SUM(cp.MONTO) FROM COMPRA_PAGO cp WHERE cp.ID_COMPRA = c.ID_COMPRA), 0) AS MONTO_PAGADO,
           COALESCE((
               SELECT SUM(ps.MONTO_TOTAL) FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'COMPRA' AND ps.ID_REFERENCIA = c.ID_COMPRA AND ep.CODIGO != 'ANULADO'
           ), 0) AS MONTO_FINANCIADO
      FROM COMPRA c
      JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = c.ID_PROVEEDOR
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = c.ID_MONEDA
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_COMPRA
     WHERE (p_id_estado_compra IS NULL OR c.ID_ESTADO_COMPRA = p_id_estado_compra)
       AND (p_id_proveedor IS NULL OR c.ID_PROVEEDOR = p_id_proveedor)
       AND (p_id_proyecto IS NULL OR c.ID_PROYECTO = p_id_proyecto)
     ORDER BY c.FECHA_COMPRA DESC;
END$$

CREATE PROCEDURE SP_COMPRA_OBTENER(
    IN p_id_compra INT UNSIGNED
)
BEGIN
    SELECT c.ID_COMPRA, c.DESCRIPCION, c.NRO_DOCUMENTO, c.FECHA_COMPRA, c.FECHA_VENCIMIENTO,
           c.MONTO_TOTAL, c.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION, c.TIPO_CAMBIO,
           c.ID_PROVEEDOR, pr.RAZON_SOCIAL AS PROVEEDOR_RAZON_SOCIAL, pr.RUC AS PROVEEDOR_RUC,
           c.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE,
           c.ID_ESTADO_COMPRA, ec.CODIGO AS ESTADO_COMPRA_CODIGO, ec.DESCRIPCION AS ESTADO_COMPRA_DESCRIPCION,
           COALESCE((SELECT SUM(cp.MONTO) FROM COMPRA_PAGO cp WHERE cp.ID_COMPRA = c.ID_COMPRA), 0) AS MONTO_PAGADO,
           COALESCE((
               SELECT SUM(ps.MONTO_TOTAL) FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'COMPRA' AND ps.ID_REFERENCIA = c.ID_COMPRA AND ep.CODIGO != 'ANULADO'
           ), 0) AS MONTO_FINANCIADO
      FROM COMPRA c
      JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = c.ID_PROVEEDOR
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = c.ID_MONEDA
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = c.ID_PROYECTO
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_COMPRA
     WHERE c.ID_COMPRA = p_id_compra;
END$$

-- Se llama despues de SP_CUENTA_MOVIMIENTO_REGISTRAR (ver nota al inicio
-- del archivo). Registra el pago parcial/total y recalcula el estado de
-- la compra segun cuanto se ha pagado en total.
CREATE PROCEDURE SP_COMPRA_PAGO_REGISTRAR(
    IN p_id_compra INT UNSIGNED,
    IN p_id_cuenta INT UNSIGNED,
    IN p_id_movimiento INT UNSIGNED,
    IN p_monto DECIMAL(14,2),
    IN p_fecha_pago DATE,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_pago INT UNSIGNED
)
BEGIN
    DECLARE v_monto_total DECIMAL(14,2);
    DECLARE v_monto_pagado DECIMAL(14,2);
    DECLARE v_id_estado_nuevo INT UNSIGNED;

    INSERT INTO COMPRA_PAGO (
        ID_COMPRA, FECHA_PAGO, MONTO, ID_CUENTA, ID_MOVIMIENTO, USUARIO_CREACION
    ) VALUES (
        p_id_compra, p_fecha_pago, p_monto, p_id_cuenta, p_id_movimiento, p_id_usuario_creacion
    );
    SET p_id_pago = LAST_INSERT_ID();

    SELECT MONTO_TOTAL INTO v_monto_total FROM COMPRA WHERE ID_COMPRA = p_id_compra;
    SELECT SUM(MONTO) INTO v_monto_pagado FROM COMPRA_PAGO WHERE ID_COMPRA = p_id_compra;

    SET v_id_estado_nuevo = (
        SELECT ID_MAESTRO FROM MAESTRO_MAESTRO
         WHERE TIPO_MAESTRO = 'ESTADO_COMPRA' AND CODIGO = IF(v_monto_pagado >= v_monto_total, 'PAGADA', 'PARCIAL')
         LIMIT 1
    );

    UPDATE COMPRA SET ID_ESTADO_COMPRA = v_id_estado_nuevo WHERE ID_COMPRA = p_id_compra;
END$$

CREATE PROCEDURE SP_COMPRA_PAGO_LISTAR(
    IN p_id_compra INT UNSIGNED
)
BEGIN
    SELECT cp.ID_PAGO, cp.ID_COMPRA, cp.FECHA_PAGO, cp.MONTO, cp.ID_CUENTA, cu.NOMBRE AS CUENTA_NOMBRE,
           cp.ID_MOVIMIENTO, cp.FECHA_CREACION
      FROM COMPRA_PAGO cp
      JOIN CUENTA_EMPRESA cu ON cu.ID_CUENTA = cp.ID_CUENTA
     WHERE cp.ID_COMPRA = p_id_compra
     ORDER BY cp.FECHA_PAGO DESC, cp.ID_PAGO DESC;
END$$

-- Cross-compra, para Cuentas por Pagar. Monto pendiente = total - pagado
-- en efectivo - financiado con pasivo.
CREATE PROCEDURE SP_COMPRA_LISTAR_PENDIENTES()
BEGIN
    SELECT c.ID_COMPRA, c.DESCRIPCION, c.FECHA_VENCIMIENTO, c.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO,
           pr.RAZON_SOCIAL AS PROVEEDOR_RAZON_SOCIAL,
           c.MONTO_TOTAL
           - COALESCE((SELECT SUM(cp.MONTO) FROM COMPRA_PAGO cp WHERE cp.ID_COMPRA = c.ID_COMPRA), 0)
           - COALESCE((
               SELECT SUM(ps.MONTO_TOTAL) FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'COMPRA' AND ps.ID_REFERENCIA = c.ID_COMPRA AND ep.CODIGO != 'ANULADO'
           ), 0) AS MONTO_PENDIENTE
      FROM COMPRA c
      JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = c.ID_PROVEEDOR
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = c.ID_MONEDA
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_COMPRA
     WHERE ec.CODIGO IN ('PENDIENTE_PAGO', 'PARCIAL')
     ORDER BY c.FECHA_VENCIMIENTO IS NULL, c.FECHA_VENCIMIENTO;
END$$

DELIMITER ;
