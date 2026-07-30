-- =====================================================================
-- Periodos de sueldo/honorario pendientes de pago de un contrato --
-- aplica a PLANILLA_FULLTIME/PARTTIME y LOCADOR MENSUAL/POR_JORNADA/
-- POR_PROYECTO (no a LOCADOR POR_HORA, que ya tiene su propio mecanismo
-- via RRHH_CONTRATO_HORAS). Un periodo se paga con una cuenta de la
-- empresa (FECHA_PAGO/ID_MOVIMIENTO) o se financia con un pasivo nuevo
-- (PASIVO.TIPO_REFERENCIA='RRHH_CONTRATO_PERIODO_PAGO') -- nunca las
-- dos formas a la vez, pero eso no se guarda aqui, se calcula al vuelo.
-- El caso normal es "Generar periodos pendientes" desde la app (un
-- periodo por mes calendario entre FECHA_INICIO y hoy/FECHA_FIN, saltando
-- los que ya existen -- ver src/lib/rrhh/periodos-pago.ts), que llama a
-- AGREGAR una vez por mes faltante; AGREGAR tambien queda disponible
-- suelto para un periodo manual (ej. "BONO EXTRAORDINARIO"). ACTUALIZAR
-- corrige uno puntual despues (ej. un mes con bono distinto al sugerido).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PERIODO_PAGO_AGREGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_TODOS;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PERIODO_PAGO_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PERIODO_PAGO_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PERIODO_PAGO_MARCAR_PAGADA;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_PENDIENTES;

DELIMITER $$

-- No-op silencioso si el contrato es LOCADOR POR_HORA (ese tipo no usa
-- periodos de pago, usa RRHH_CONTRATO_HORAS).
CREATE PROCEDURE SP_RRHH_CONTRATO_PERIODO_PAGO_AGREGAR(
    IN p_id_contrato INT UNSIGNED,
    IN p_periodo VARCHAR(100),
    IN p_monto DECIMAL(10,2),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_periodo_pago INT UNSIGNED
)
BEGIN
    DECLARE v_tipo_pago_codigo VARCHAR(30);

    SELECT tpl.CODIGO INTO v_tipo_pago_codigo
      FROM RRHH_CONTRATO c
      LEFT JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = c.ID_TIPO_PAGO_LOCADOR
     WHERE c.ID_CONTRATO = p_id_contrato;

    IF v_tipo_pago_codigo IS NULL OR v_tipo_pago_codigo != 'POR_HORA' THEN
        INSERT INTO RRHH_CONTRATO_PERIODO_PAGO (ID_CONTRATO, PERIODO, MONTO, USUARIO_CREACION)
        VALUES (p_id_contrato, p_periodo, p_monto, p_id_usuario_creacion);

        SET p_id_periodo_pago = LAST_INSERT_ID();
    END IF;
END$$

-- FINANCIADO_CON_PASIVO: si un pasivo (no anulado) referencia este
-- periodo, ya esta resuelto aunque ID_MOVIMIENTO siga NULL.
CREATE PROCEDURE SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    SELECT pp.ID_PERIODO_PAGO, pp.ID_CONTRATO, pp.PERIODO, pp.MONTO, pp.FECHA_PAGO, pp.ID_MOVIMIENTO, pp.FECHA_CREACION,
           EXISTS (
               SELECT 1 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_PERIODO_PAGO' AND ps.ID_REFERENCIA = pp.ID_PERIODO_PAGO
                  AND ep.CODIGO != 'ANULADO'
           ) AS FINANCIADO_CON_PASIVO
      FROM RRHH_CONTRATO_PERIODO_PAGO pp
     WHERE pp.ID_CONTRATO = p_id_contrato
     ORDER BY pp.FECHA_CREACION DESC;
END$$

-- Cross-contrato, sin filtro de aislamiento de datos sensibles (a
-- diferencia de SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_PENDIENTES) --
-- se usa solo dentro de Facturacion/Proyectos, que ya tiene acceso a
-- PERIODO/MONTO por su cuenta via "Mano de obra (asignacion manual)".
-- Deja elegir un periodo ya cargado en el contrato (con su monto) como
-- punto de partida al agregar una asignacion manual en Proyectos, en vez
-- de escribir periodo/monto a mano -- el monto sigue siendo editable
-- ahi, por si solo una parte de ese periodo aplica a este proyecto (ver
-- AgregarCostoManoObraForm.tsx).
CREATE PROCEDURE SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_TODOS()
BEGIN
    SELECT pp.ID_PERIODO_PAGO, pp.ID_CONTRATO, pp.PERIODO, pp.MONTO, pp.FECHA_PAGO, pp.ID_MOVIMIENTO, pp.FECHA_CREACION,
           EXISTS (
               SELECT 1 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_PERIODO_PAGO' AND ps.ID_REFERENCIA = pp.ID_PERIODO_PAGO
                  AND ep.CODIGO != 'ANULADO'
           ) AS FINANCIADO_CON_PASIVO
      FROM RRHH_CONTRATO_PERIODO_PAGO pp
     ORDER BY pp.ID_CONTRATO, pp.FECHA_CREACION DESC;
END$$

-- Editar un periodo ya generado (monto y/o etiqueta) mientras siga sin
-- pagar y sin financiar -- no-op silencioso en cualquier otro caso, mismo
-- estilo que SP_RRHH_CONTRATO_ACTUALIZAR_FUNCIONES. El calculo de "cuales
-- periodos generar" vive en la app (igual que el monto sugerido), esto
-- solo corrige uno puntual despues (ej. un mes con bono distinto).
CREATE PROCEDURE SP_RRHH_CONTRATO_PERIODO_PAGO_ACTUALIZAR(
    IN p_id_periodo_pago INT UNSIGNED,
    IN p_periodo VARCHAR(100),
    IN p_monto DECIMAL(10,2)
)
BEGIN
    UPDATE RRHH_CONTRATO_PERIODO_PAGO pp
       SET pp.PERIODO = p_periodo, pp.MONTO = p_monto
     WHERE pp.ID_PERIODO_PAGO = p_id_periodo_pago
       AND pp.ID_MOVIMIENTO IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM PASIVO ps
             JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
            WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_PERIODO_PAGO' AND ps.ID_REFERENCIA = pp.ID_PERIODO_PAGO
              AND ep.CODIGO != 'ANULADO'
       );
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_PERIODO_PAGO_ELIMINAR(
    IN p_id_periodo_pago INT UNSIGNED
)
BEGIN
    DELETE FROM RRHH_CONTRATO_PERIODO_PAGO WHERE ID_PERIODO_PAGO = p_id_periodo_pago;
END$$

-- No-op silencioso si el periodo ya estaba pagado, mismo patron que
-- SP_RRHH_CONTRATO_HORAS_MARCAR_PAGADA.
CREATE PROCEDURE SP_RRHH_CONTRATO_PERIODO_PAGO_MARCAR_PAGADA(
    IN p_id_periodo_pago INT UNSIGNED,
    IN p_id_movimiento INT UNSIGNED,
    IN p_fecha_pago DATE
)
BEGIN
    UPDATE RRHH_CONTRATO_PERIODO_PAGO
       SET FECHA_PAGO = p_fecha_pago, ID_MOVIMIENTO = p_id_movimiento
     WHERE ID_PERIODO_PAGO = p_id_periodo_pago AND ID_MOVIMIENTO IS NULL;
END$$

-- Cross-contrato, para Cuentas por Pagar -- sin campos sensibles (nada
-- de DNI/direccion/banco/firma), mismo aislamiento de datos que ya usa
-- SP_RRHH_CONTRATO_LISTAR_PARA_PAGOS. Excluye periodos ya pagados o
-- financiados con un pasivo.
CREATE PROCEDURE SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_PENDIENTES()
BEGIN
    SELECT pp.ID_PERIODO_PAGO, pp.ID_CONTRATO, pp.PERIODO, pp.MONTO, pp.FECHA_CREACION,
           u.NOMBRES, u.APELLIDOS, c.CARGO
      FROM RRHH_CONTRATO_PERIODO_PAGO pp
      JOIN RRHH_CONTRATO c ON c.ID_CONTRATO = pp.ID_CONTRATO
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
     WHERE pp.ID_MOVIMIENTO IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM PASIVO ps
             JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
            WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_PERIODO_PAGO' AND ps.ID_REFERENCIA = pp.ID_PERIODO_PAGO
              AND ep.CODIGO != 'ANULADO'
       )
     ORDER BY pp.FECHA_CREACION;
END$$

DELIMITER ;
