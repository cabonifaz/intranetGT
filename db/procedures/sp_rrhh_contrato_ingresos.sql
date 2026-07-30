-- =====================================================================
-- Lineas de ingreso del contrato: conceptos remunerativos (planilla) y
-- proyectos con tarifa/hora + horas trabajadas (locador por hora).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_CONCEPTO_AGREGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_CONCEPTO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_CONCEPTO_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PROYECTO_AGREGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PROYECTO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PROYECTO_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_HORAS_REGISTRAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_HORAS_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_HORAS_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_HORAS_MARCAR_PAGADA;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_HORAS_LISTAR_PENDIENTES;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_HORAS_LISTAR_TODOS;

DELIMITER $$

-- Upsert: agregar el mismo concepto dos veces actualiza el monto (UNIQUE
-- ID_CONTRATO+ID_CONCEPTO), asi RRHH puede corregir sin borrar primero.
CREATE PROCEDURE SP_RRHH_CONTRATO_CONCEPTO_AGREGAR(
    IN p_id_contrato INT UNSIGNED,
    IN p_id_concepto INT UNSIGNED,
    IN p_monto DECIMAL(10,2),
    OUT p_id_contrato_concepto INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO RRHH_CONTRATO_CONCEPTO (ID_CONTRATO, ID_CONCEPTO, MONTO, ID_ESTADO)
    VALUES (p_id_contrato, p_id_concepto, p_monto, v_id_activo)
    ON DUPLICATE KEY UPDATE MONTO = p_monto, ID_ESTADO = v_id_activo;

    SELECT ID_CONTRATO_CONCEPTO INTO p_id_contrato_concepto
      FROM RRHH_CONTRATO_CONCEPTO
     WHERE ID_CONTRATO = p_id_contrato AND ID_CONCEPTO = p_id_concepto;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_CONCEPTO_LISTAR(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    SELECT cc.ID_CONTRATO_CONCEPTO, cc.ID_CONCEPTO, m.CODIGO AS CONCEPTO_CODIGO,
           m.DESCRIPCION AS CONCEPTO_DESCRIPCION, cc.MONTO
      FROM RRHH_CONTRATO_CONCEPTO cc
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = cc.ID_CONCEPTO
     WHERE cc.ID_CONTRATO = p_id_contrato
     ORDER BY m.ORDEN;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_CONCEPTO_ELIMINAR(
    IN p_id_contrato_concepto INT UNSIGNED
)
BEGIN
    DELETE FROM RRHH_CONTRATO_CONCEPTO WHERE ID_CONTRATO_CONCEPTO = p_id_contrato_concepto;
END$$

-- p_id_proyecto ya no es opcional: enlaza este proyecto-por-hora del
-- contrato al Proyecto/Servicio real (ya no hay texto libre), y de paso
-- hace que sus horas cuenten solas en el costeo de ese proyecto. Si la
-- persona ya tiene una asignacion manual de mano de obra para ese mismo
-- Proyecto (PROYECTO_COSTO_MANO_OBRA), no se crea -- evita contarla dos
-- veces. No-op silencioso si falta el proyecto o si ya esta asignado
-- manualmente (p_id_contrato_proyecto queda NULL).
-- p_id_moneda es obligatorio (RRHH_CONTRATO_PROYECTO.ID_MONEDA es NOT
-- NULL) -- se confia en que la app siempre lo mande. p_tipo_cambio solo
-- se exige (y se guarda) cuando la moneda elegida difiere de la moneda
-- del proyecto enlazado; si coincide se guarda NULL aunque venga algo.
CREATE PROCEDURE SP_RRHH_CONTRATO_PROYECTO_AGREGAR(
    IN p_id_contrato INT UNSIGNED,
    IN p_id_proyecto INT UNSIGNED,
    IN p_tarifa_hora DECIMAL(10,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    OUT p_id_contrato_proyecto INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_ya_asignado_manual INT;
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_requiere_tc TINYINT DEFAULT 0;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_ya_asignado_manual = 0;

    IF p_id_proyecto IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ya_asignado_manual
          FROM PROYECTO_COSTO_MANO_OBRA
         WHERE ID_CONTRATO = p_id_contrato AND ID_PROYECTO = p_id_proyecto;

        SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
        IF p_id_moneda IS NOT NULL AND p_id_moneda != v_id_moneda_proyecto THEN
            SET v_requiere_tc = 1;
        END IF;
    END IF;

    IF p_id_proyecto IS NOT NULL AND v_ya_asignado_manual = 0 AND NOT (v_requiere_tc = 1 AND p_tipo_cambio IS NULL) THEN
        INSERT INTO RRHH_CONTRATO_PROYECTO (ID_CONTRATO, ID_PROYECTO, TARIFA_HORA, ID_MONEDA, TIPO_CAMBIO, ID_ESTADO)
        VALUES (p_id_contrato, p_id_proyecto, p_tarifa_hora, p_id_moneda, IF(v_requiere_tc = 1, p_tipo_cambio, NULL), v_id_activo);

        SET p_id_contrato_proyecto = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_PROYECTO_LISTAR(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    SELECT cp.ID_CONTRATO_PROYECTO, cp.TARIFA_HORA, cp.ID_PROYECTO,
           cp.ID_MONEDA, mon.CODIGO AS MONEDA_CODIGO, cp.TIPO_CAMBIO,
           py.NOMBRE AS NOMBRE_PROYECTO
      FROM RRHH_CONTRATO_PROYECTO cp
      JOIN MAESTRO_MAESTRO mon ON mon.ID_MAESTRO = cp.ID_MONEDA
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = cp.ID_PROYECTO
     WHERE cp.ID_CONTRATO = p_id_contrato AND cp.ID_ESTADO = v_id_activo
     ORDER BY py.NOMBRE;
END$$

-- Tambien borra las horas cargadas de ese proyecto (FK), no se puede
-- dejar un proyecto a medio borrar con horas huerfanas.
CREATE PROCEDURE SP_RRHH_CONTRATO_PROYECTO_ELIMINAR(
    IN p_id_contrato_proyecto INT UNSIGNED
)
BEGIN
    DELETE FROM RRHH_CONTRATO_HORAS WHERE ID_CONTRATO_PROYECTO = p_id_contrato_proyecto;
    DELETE FROM RRHH_CONTRATO_PROYECTO WHERE ID_CONTRATO_PROYECTO = p_id_contrato_proyecto;
END$$

-- El monto se calcula aqui mismo (horas x tarifa vigente del proyecto),
-- no se recibe desde la app -- una sola fuente de verdad para el calculo.
CREATE PROCEDURE SP_RRHH_CONTRATO_HORAS_REGISTRAR(
    IN p_id_contrato_proyecto INT UNSIGNED,
    IN p_periodo VARCHAR(100),
    IN p_horas DECIMAL(6,2),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_contrato_horas INT UNSIGNED,
    OUT p_monto_calculado DECIMAL(10,2)
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_tarifa_hora DECIMAL(10,2);

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SELECT TARIFA_HORA INTO v_tarifa_hora FROM RRHH_CONTRATO_PROYECTO WHERE ID_CONTRATO_PROYECTO = p_id_contrato_proyecto;
    SET p_monto_calculado = ROUND(p_horas * v_tarifa_hora, 2);

    INSERT INTO RRHH_CONTRATO_HORAS (ID_CONTRATO_PROYECTO, PERIODO, HORAS, MONTO_CALCULADO, ID_ESTADO, USUARIO_CREACION)
    VALUES (p_id_contrato_proyecto, p_periodo, p_horas, p_monto_calculado, v_id_activo, p_id_usuario_creacion);

    SET p_id_contrato_horas = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_HORAS_LISTAR(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    SELECT h.ID_CONTRATO_HORAS, h.ID_CONTRATO_PROYECTO, p.ID_PROYECTO, py.NOMBRE AS NOMBRE_PROYECTO,
           p.ID_MONEDA, mon.CODIGO AS MONEDA_CODIGO, p.TIPO_CAMBIO,
           h.PERIODO, h.HORAS, h.MONTO_CALCULADO, h.FECHA_CREACION,
           h.FECHA_PAGO, h.ID_MOVIMIENTO,
           EXISTS (
               SELECT 1 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_HORAS' AND ps.ID_REFERENCIA = h.ID_CONTRATO_HORAS
                  AND ep.CODIGO != 'ANULADO'
           ) AS FINANCIADO_CON_PASIVO
      FROM RRHH_CONTRATO_HORAS h
      JOIN RRHH_CONTRATO_PROYECTO p ON p.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
      JOIN MAESTRO_MAESTRO mon ON mon.ID_MAESTRO = p.ID_MONEDA
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = p.ID_PROYECTO
     WHERE p.ID_CONTRATO = p_id_contrato
     ORDER BY h.FECHA_CREACION DESC;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_HORAS_ELIMINAR(
    IN p_id_contrato_horas INT UNSIGNED
)
BEGIN
    DELETE FROM RRHH_CONTRATO_HORAS WHERE ID_CONTRATO_HORAS = p_id_contrato_horas;
END$$

-- No-op silencioso si el periodo ya estaba pagado, mismo criterio que
-- SP_PROYECTO_COSTO_MANO_OBRA_MARCAR_PAGADA/SP_PASIVO_CUOTA_MARCAR_PAGADA.
-- Este es el unico mecanismo de pago para locadores POR_HORA -- "Pagos a
-- contratos" no los cubre (su MONTO_SUGERIDO sale NULL para ese tipo).
CREATE PROCEDURE SP_RRHH_CONTRATO_HORAS_MARCAR_PAGADA(
    IN p_id_contrato_horas INT UNSIGNED,
    IN p_id_movimiento INT UNSIGNED,
    IN p_fecha_pago DATE
)
BEGIN
    UPDATE RRHH_CONTRATO_HORAS
       SET FECHA_PAGO = p_fecha_pago, ID_MOVIMIENTO = p_id_movimiento
     WHERE ID_CONTRATO_HORAS = p_id_contrato_horas AND ID_MOVIMIENTO IS NULL;
END$$

-- Cross-contrato, para Cuentas por Pagar -- sin campos sensibles, mismo
-- aislamiento que SP_RRHH_CONTRATO_LISTAR_PARA_PAGOS. Excluye horas ya
-- pagadas o financiadas con un pasivo.
CREATE PROCEDURE SP_RRHH_CONTRATO_HORAS_LISTAR_PENDIENTES()
BEGIN
    SELECT h.ID_CONTRATO_HORAS, h.ID_CONTRATO_PROYECTO, p.ID_PROYECTO, c.ID_CONTRATO, py.NOMBRE AS NOMBRE_PROYECTO,
           p.ID_MONEDA, mon.CODIGO AS MONEDA_CODIGO, p.TIPO_CAMBIO,
           h.PERIODO, h.MONTO_CALCULADO, h.FECHA_CREACION,
           u.NOMBRES, u.APELLIDOS
      FROM RRHH_CONTRATO_HORAS h
      JOIN RRHH_CONTRATO_PROYECTO p ON p.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
      JOIN MAESTRO_MAESTRO mon ON mon.ID_MAESTRO = p.ID_MONEDA
      JOIN RRHH_CONTRATO c ON c.ID_CONTRATO = p.ID_CONTRATO
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = p.ID_PROYECTO
     WHERE h.ID_MOVIMIENTO IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM PASIVO ps
             JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
            WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_HORAS' AND ps.ID_REFERENCIA = h.ID_CONTRATO_HORAS
              AND ep.CODIGO != 'ANULADO'
       )
     ORDER BY h.FECHA_CREACION;
END$$

-- Cross-contrato, sin filtro de pendiente/pagado -- para dejar elegir una
-- fila de horas ya cargada (con su monto ya calculado) como punto de
-- partida al agregar mano de obra manual en Proyectos para un locador
-- POR_HORA, mismo criterio que SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_TODOS
-- ya hace para PLANILLA/MENSUAL/POR_JORNADA/POR_PROYECTO (esos usan
-- RRHH_CONTRATO_PERIODO_PAGO, que no aplica a POR_HORA -- por eso "jalar
-- periodo" no mostraba nada para este tipo de contrato hasta ahora). El
-- monto sigue siendo editable en el formulario, esto solo evita
-- recalcular horas x tarifa a mano.
CREATE PROCEDURE SP_RRHH_CONTRATO_HORAS_LISTAR_TODOS()
BEGIN
    SELECT h.ID_CONTRATO_HORAS, c.ID_CONTRATO, py.NOMBRE AS NOMBRE_PROYECTO,
           h.PERIODO, h.HORAS, h.MONTO_CALCULADO, h.FECHA_CREACION, h.ID_MOVIMIENTO,
           EXISTS (
               SELECT 1 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_HORAS' AND ps.ID_REFERENCIA = h.ID_CONTRATO_HORAS
                  AND ep.CODIGO != 'ANULADO'
           ) AS FINANCIADO_CON_PASIVO
      FROM RRHH_CONTRATO_HORAS h
      JOIN RRHH_CONTRATO_PROYECTO p ON p.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
      JOIN RRHH_CONTRATO c ON c.ID_CONTRATO = p.ID_CONTRATO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = p.ID_PROYECTO
     ORDER BY c.ID_CONTRATO, h.FECHA_CREACION DESC;
END$$

DELIMITER ;
