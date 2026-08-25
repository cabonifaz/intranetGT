-- =====================================================================
-- Procedimientos del modulo de proyectos: CRUD de PROYECTO, su libro de
-- ingresos (PROYECTO_INGRESO) y la asignacion manual de mano de obra
-- (PROYECTO_COSTO_MANO_OBRA), mas el costeo agregado (compras, mano de
-- obra por horas via RRHH_CONTRATO_PROYECTO/RRHH_CONTRATO_HORAS, mano de
-- obra manual, pagos recurrentes via PAGO_RECURRENTE/PAGO_RECURRENTE_INSTANCIA,
-- ingresos) que alimenta el dashboard.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_PROYECTO_CREAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_OBTENER;
DROP PROCEDURE IF EXISTS SP_PROYECTO_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CAMBIAR_ESTADO;
DROP PROCEDURE IF EXISTS SP_PROYECTO_INGRESO_AGREGAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_INGRESO_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_INGRESO_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_COSTO_MANO_OBRA_AGREGAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_COSTO_MANO_OBRA_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_COSTO_MANO_OBRA_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_COSTO_MANO_OBRA_MARCAR_PAGADA;
DROP PROCEDURE IF EXISTS SP_PROYECTO_COSTO_MANO_OBRA_LISTAR_PENDIENTES;
DROP PROCEDURE IF EXISTS SP_PROYECTO_MANO_OBRA_HORAS_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_AGREGAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_MARCAR_FACTURADO;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_MARCAR_COBRADO;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_DESHACER_COBRO;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_ANULAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_LISTAR_PENDIENTES;
DROP PROCEDURE IF EXISTS SP_PROYECTO_HITO_LISTAR_IGV_PENDIENTE;
DROP PROCEDURE IF EXISTS SP_PROYECTO_MOVIMIENTO_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_RESET_INGRESOS;
DROP PROCEDURE IF EXISTS SP_PROYECTO_RESET_COMPRAS;
DROP PROCEDURE IF EXISTS SP_PROYECTO_RESET_COSTOS_LABORALES;

DELIMITER $$

-- Si p_es_interno=1 se fuerza ID_CLIENTE a NULL sin importar lo que
-- venga en p_id_cliente (guard contra inconsistencia, no solo confiar
-- en la app).
CREATE PROCEDURE SP_PROYECTO_CREAR(
    IN p_id_tipo_proyecto INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_id_cliente INT UNSIGNED,
    IN p_es_interno TINYINT,
    IN p_descripcion VARCHAR(300),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin_estimada DATE,
    IN p_costo_presupuestado DECIMAL(14,2),
    IN p_ingreso_esperado DECIMAL(14,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_proyecto INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_en_curso INT UNSIGNED;
    DECLARE v_id_cliente INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_en_curso = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PROYECTO' AND CODIGO = 'EN_CURSO' LIMIT 1);
    SET v_id_cliente = IF(p_es_interno = 1, NULL, p_id_cliente);

    INSERT INTO PROYECTO (
        ID_TIPO_PROYECTO, NOMBRE, ID_CLIENTE, ES_INTERNO, DESCRIPCION, FECHA_INICIO, FECHA_FIN_ESTIMADA,
        COSTO_PRESUPUESTADO, INGRESO_ESPERADO, ID_MONEDA, ID_ESTADO_PROYECTO, ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_id_tipo_proyecto, p_nombre, v_id_cliente, p_es_interno, p_descripcion, p_fecha_inicio, p_fecha_fin_estimada,
        p_costo_presupuestado, p_ingreso_esperado, p_id_moneda, v_id_en_curso, v_id_activo, p_id_usuario_creacion
    );

    SET p_id_proyecto = LAST_INSERT_ID();
END$$

-- COSTO_COMPRAS usa MONTO_TOTAL (comprometido), no lo ya pagado -- una
-- compra PENDIENTE_PAGO ya es costo real del proyecto aunque la caja no
-- la haya pagado todavia; MONTO_PAGADO es cosa de tesoreria, no de
-- rentabilidad del proyecto (Compras ya expone ese dato aparte).
-- COSTO_COMPRAS/COSTO_MANO_OBRA_MANUAL/INGRESO_REAL convierten a la
-- moneda del proyecto con TIPO_CAMBIO cuando la fila esta en otra moneda
-- (ver 031_tipo_cambio_proyecto.sql/033_ingreso_moneda.sql). TIPO_CAMBIO
-- siempre se captura como "soles por dolar" (asi lo entiende y lo tipea
-- cualquiera en Peru, mismo criterio que el TC oficial SUNAT que ya usa
-- este sistema) -- por eso la conversion NO es un simple *TIPO_CAMBIO
-- para cualquier par de monedas: si la fila esta en soles y el proyecto
-- en dolares hay que DIVIDIR (soles / (soles por dolar) = dolares); si la
-- fila esta en dolares y el proyecto en soles hay que MULTIPLICAR
-- (dolares * (soles por dolar) = soles). v_id_moneda_usd identifica cual
-- de los dos lados es el dolar para elegir la operacion correcta.
CREATE PROCEDURE SP_PROYECTO_LISTAR(
    IN p_id_estado_proyecto INT UNSIGNED,
    IN p_solo_activos TINYINT
)
BEGIN
    DECLARE v_id_moneda_usd INT UNSIGNED;
    SET v_id_moneda_usd = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'MONEDA' AND CODIGO = 'USD' LIMIT 1);

    SELECT p.ID_PROYECTO, p.NOMBRE, p.ID_CLIENTE, p.ES_INTERNO, cl.RAZON_SOCIAL AS CLIENTE_RAZON_SOCIAL,
           p.FECHA_INICIO, p.FECHA_FIN_ESTIMADA,
           p.COSTO_PRESUPUESTADO, p.INGRESO_ESPERADO,
           p.ID_TIPO_PROYECTO, tp.CODIGO AS TIPO_PROYECTO_CODIGO, tp.DESCRIPCION AS TIPO_PROYECTO_DESCRIPCION,
           p.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION,
           p.ID_ESTADO_PROYECTO, ep.CODIGO AS ESTADO_PROYECTO_CODIGO, ep.DESCRIPCION AS ESTADO_PROYECTO_DESCRIPCION,
           COALESCE((
               SELECT SUM(
                          CASE WHEN c.ID_MONEDA = p.ID_MONEDA THEN c.MONTO_TOTAL
                               WHEN c.TIPO_CAMBIO IS NULL THEN c.MONTO_TOTAL
                               WHEN c.ID_MONEDA = v_id_moneda_usd THEN c.MONTO_TOTAL * c.TIPO_CAMBIO
                               ELSE c.MONTO_TOTAL / c.TIPO_CAMBIO END
                      )
                 FROM COMPRA c
                 JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_COMPRA
                WHERE c.ID_PROYECTO = p.ID_PROYECTO AND ec.CODIGO != 'ANULADA'
           ), 0) AS COSTO_COMPRAS,
           COALESCE((
               SELECT SUM(
                          CASE WHEN cp.ID_MONEDA = p.ID_MONEDA THEN h.MONTO_CALCULADO
                               WHEN cp.TIPO_CAMBIO IS NULL THEN h.MONTO_CALCULADO
                               WHEN cp.ID_MONEDA = v_id_moneda_usd THEN h.MONTO_CALCULADO * cp.TIPO_CAMBIO
                               ELSE h.MONTO_CALCULADO / cp.TIPO_CAMBIO END
                      )
                 FROM RRHH_CONTRATO_HORAS h
                 JOIN RRHH_CONTRATO_PROYECTO cp ON cp.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
                WHERE cp.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS COSTO_MANO_OBRA_HORAS,
           COALESCE((
               SELECT SUM(
                          CASE WHEN mo.ID_MONEDA = p.ID_MONEDA THEN mo.MONTO
                               WHEN mo.TIPO_CAMBIO IS NULL THEN mo.MONTO
                               WHEN mo.ID_MONEDA = v_id_moneda_usd THEN mo.MONTO * mo.TIPO_CAMBIO
                               ELSE mo.MONTO / mo.TIPO_CAMBIO END
                      )
                 FROM PROYECTO_COSTO_MANO_OBRA mo WHERE mo.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS COSTO_MANO_OBRA_MANUAL,
           COALESCE((
               SELECT SUM(
                          CASE WHEN rc.ID_MONEDA = p.ID_MONEDA THEN rc.TARIFA
                               WHEN rc.TIPO_CAMBIO IS NULL THEN rc.TARIFA
                               WHEN rc.ID_MONEDA = v_id_moneda_usd THEN rc.TARIFA * rc.TIPO_CAMBIO
                               ELSE rc.TARIFA / rc.TIPO_CAMBIO END
                      )
                 FROM RRHH_CONTRATO rc
                 JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = rc.ID_TIPO_PAGO_LOCADOR
                WHERE rc.ID_PROYECTO = p.ID_PROYECTO AND tpl.CODIGO = 'POR_PROYECTO'
           ), 0) AS COSTO_MANO_OBRA_TARIFA_UNICA,
           COALESCE((
               SELECT SUM(
                          CASE WHEN pgr.ID_MONEDA = p.ID_MONEDA THEN pgi.MONTO
                               WHEN pgr.TIPO_CAMBIO IS NULL THEN pgi.MONTO
                               WHEN pgr.ID_MONEDA = v_id_moneda_usd THEN pgi.MONTO * pgr.TIPO_CAMBIO
                               ELSE pgi.MONTO / pgr.TIPO_CAMBIO END
                      )
                 FROM PAGO_RECURRENTE_INSTANCIA pgi
                 JOIN PAGO_RECURRENTE pgr ON pgr.ID_PAGO_RECURRENTE = pgi.ID_PAGO_RECURRENTE
                WHERE pgr.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS COSTO_PAGOS_RECURRENTES,
           COALESCE((
               SELECT SUM(
                          CASE WHEN i.ID_MONEDA = p.ID_MONEDA THEN i.MONTO
                               WHEN i.TIPO_CAMBIO IS NULL THEN i.MONTO
                               WHEN i.ID_MONEDA = v_id_moneda_usd THEN i.MONTO * i.TIPO_CAMBIO
                               ELSE i.MONTO / i.TIPO_CAMBIO END
                      )
                 FROM PROYECTO_INGRESO i WHERE i.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS INGRESO_REAL,
           COALESCE((
               SELECT SUM(h.MONTO) FROM PROYECTO_HITO h
                 JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
                WHERE h.ID_PROYECTO = p.ID_PROYECTO AND eh.CODIGO IN ('PLANEADO', 'FACTURADO')
           ), 0) AS MONTO_PLAN_PENDIENTE,
           COALESCE((
               SELECT SUM(h.MONTO) FROM PROYECTO_HITO h
                 JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
                WHERE h.ID_PROYECTO = p.ID_PROYECTO AND eh.CODIGO IN ('FACTURADO', 'COBRADO')
           ), 0) AS MONTO_FACTURADO,
           COALESCE((
               SELECT SUM(
                          CASE WHEN ps.ID_MONEDA = p.ID_MONEDA THEN ps.MONTO_TOTAL
                               WHEN ps.TIPO_CAMBIO IS NULL THEN ps.MONTO_TOTAL
                               WHEN ps.ID_MONEDA = v_id_moneda_usd THEN ps.MONTO_TOTAL * ps.TIPO_CAMBIO
                               ELSE ps.MONTO_TOTAL / ps.TIPO_CAMBIO END
                      )
                 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO eps ON eps.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.ID_PROYECTO = p.ID_PROYECTO AND eps.CODIGO != 'ANULADO'
           ), 0) AS PASIVO_GENERADO
      FROM PROYECTO p
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PROYECTO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PROYECTO
      LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = p.ID_CLIENTE
     WHERE (p_id_estado_proyecto IS NULL OR p.ID_ESTADO_PROYECTO = p_id_estado_proyecto)
       AND (p_solo_activos = 0 OR ep.CODIGO = 'EN_CURSO')
     ORDER BY ep.CODIGO = 'EN_CURSO' DESC, p.FECHA_INICIO DESC;
END$$

-- Misma logica de conversion que SP_PROYECTO_LISTAR (ver comentario ahi
-- sobre TIPO_CAMBIO="soles por dolar" y por que la operacion depende de
-- cual lado es el dolar, no un *TIPO_CAMBIO ciego).
CREATE PROCEDURE SP_PROYECTO_OBTENER(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    DECLARE v_id_moneda_usd INT UNSIGNED;
    SET v_id_moneda_usd = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'MONEDA' AND CODIGO = 'USD' LIMIT 1);

    SELECT p.ID_PROYECTO, p.NOMBRE, p.ID_CLIENTE, p.ES_INTERNO, cl.RAZON_SOCIAL AS CLIENTE_RAZON_SOCIAL,
           p.DESCRIPCION, p.FECHA_INICIO, p.FECHA_FIN_ESTIMADA,
           p.COSTO_PRESUPUESTADO, p.INGRESO_ESPERADO,
           p.ID_TIPO_PROYECTO, tp.CODIGO AS TIPO_PROYECTO_CODIGO, tp.DESCRIPCION AS TIPO_PROYECTO_DESCRIPCION,
           p.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION,
           p.ID_ESTADO_PROYECTO, ep.CODIGO AS ESTADO_PROYECTO_CODIGO, ep.DESCRIPCION AS ESTADO_PROYECTO_DESCRIPCION,
           COALESCE((
               SELECT SUM(
                          CASE WHEN c.ID_MONEDA = p.ID_MONEDA THEN c.MONTO_TOTAL
                               WHEN c.TIPO_CAMBIO IS NULL THEN c.MONTO_TOTAL
                               WHEN c.ID_MONEDA = v_id_moneda_usd THEN c.MONTO_TOTAL * c.TIPO_CAMBIO
                               ELSE c.MONTO_TOTAL / c.TIPO_CAMBIO END
                      )
                 FROM COMPRA c
                 JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_COMPRA
                WHERE c.ID_PROYECTO = p.ID_PROYECTO AND ec.CODIGO != 'ANULADA'
           ), 0) AS COSTO_COMPRAS,
           COALESCE((
               SELECT SUM(
                          CASE WHEN c2.ID_MONEDA = p.ID_MONEDA THEN cp2.MONTO
                               WHEN c2.TIPO_CAMBIO IS NULL THEN cp2.MONTO
                               WHEN c2.ID_MONEDA = v_id_moneda_usd THEN cp2.MONTO * c2.TIPO_CAMBIO
                               ELSE cp2.MONTO / c2.TIPO_CAMBIO END
                      )
                 FROM COMPRA_PAGO cp2
                 JOIN COMPRA c2 ON c2.ID_COMPRA = cp2.ID_COMPRA
                WHERE c2.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS COSTO_COMPRAS_PAGADO,
           COALESCE((
               SELECT SUM(
                          CASE WHEN cp.ID_MONEDA = p.ID_MONEDA THEN h.MONTO_CALCULADO
                               WHEN cp.TIPO_CAMBIO IS NULL THEN h.MONTO_CALCULADO
                               WHEN cp.ID_MONEDA = v_id_moneda_usd THEN h.MONTO_CALCULADO * cp.TIPO_CAMBIO
                               ELSE h.MONTO_CALCULADO / cp.TIPO_CAMBIO END
                      )
                 FROM RRHH_CONTRATO_HORAS h
                 JOIN RRHH_CONTRATO_PROYECTO cp ON cp.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
                WHERE cp.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS COSTO_MANO_OBRA_HORAS,
           COALESCE((
               SELECT SUM(
                          CASE WHEN mo.ID_MONEDA = p.ID_MONEDA THEN mo.MONTO
                               WHEN mo.TIPO_CAMBIO IS NULL THEN mo.MONTO
                               WHEN mo.ID_MONEDA = v_id_moneda_usd THEN mo.MONTO * mo.TIPO_CAMBIO
                               ELSE mo.MONTO / mo.TIPO_CAMBIO END
                      )
                 FROM PROYECTO_COSTO_MANO_OBRA mo WHERE mo.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS COSTO_MANO_OBRA_MANUAL,
           COALESCE((
               SELECT SUM(
                          CASE WHEN rc.ID_MONEDA = p.ID_MONEDA THEN rc.TARIFA
                               WHEN rc.TIPO_CAMBIO IS NULL THEN rc.TARIFA
                               WHEN rc.ID_MONEDA = v_id_moneda_usd THEN rc.TARIFA * rc.TIPO_CAMBIO
                               ELSE rc.TARIFA / rc.TIPO_CAMBIO END
                      )
                 FROM RRHH_CONTRATO rc
                 JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = rc.ID_TIPO_PAGO_LOCADOR
                WHERE rc.ID_PROYECTO = p.ID_PROYECTO AND tpl.CODIGO = 'POR_PROYECTO'
           ), 0) AS COSTO_MANO_OBRA_TARIFA_UNICA,
           COALESCE((
               SELECT SUM(
                          CASE WHEN pgr.ID_MONEDA = p.ID_MONEDA THEN pgi.MONTO
                               WHEN pgr.TIPO_CAMBIO IS NULL THEN pgi.MONTO
                               WHEN pgr.ID_MONEDA = v_id_moneda_usd THEN pgi.MONTO * pgr.TIPO_CAMBIO
                               ELSE pgi.MONTO / pgr.TIPO_CAMBIO END
                      )
                 FROM PAGO_RECURRENTE_INSTANCIA pgi
                 JOIN PAGO_RECURRENTE pgr ON pgr.ID_PAGO_RECURRENTE = pgi.ID_PAGO_RECURRENTE
                WHERE pgr.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS COSTO_PAGOS_RECURRENTES,
           COALESCE((
               SELECT SUM(
                          CASE WHEN mo2.ID_MONEDA = p.ID_MONEDA THEN mo2.MONTO
                               WHEN mo2.TIPO_CAMBIO IS NULL THEN mo2.MONTO
                               WHEN mo2.ID_MONEDA = v_id_moneda_usd THEN mo2.MONTO * mo2.TIPO_CAMBIO
                               ELSE mo2.MONTO / mo2.TIPO_CAMBIO END
                      )
                 FROM PROYECTO_COSTO_MANO_OBRA mo2
                WHERE mo2.ID_PROYECTO = p.ID_PROYECTO
                  AND (
                      mo2.ID_MOVIMIENTO IS NOT NULL
                      OR EXISTS (
                          SELECT 1 FROM PASIVO ps4
                            JOIN MAESTRO_MAESTRO ep4 ON ep4.ID_MAESTRO = ps4.ID_ESTADO_PASIVO
                           WHERE ps4.TIPO_REFERENCIA = 'PROYECTO_COSTO_MANO_OBRA' AND ps4.ID_REFERENCIA = mo2.ID_ASIGNACION
                             AND ep4.CODIGO != 'ANULADO'
                      )
                  )
           ), 0) AS COSTO_MANO_OBRA_MANUAL_PAGADO,
           COALESCE((
               SELECT SUM(
                          CASE WHEN cp3.ID_MONEDA = p.ID_MONEDA THEN h2.MONTO_CALCULADO
                               WHEN cp3.TIPO_CAMBIO IS NULL THEN h2.MONTO_CALCULADO
                               WHEN cp3.ID_MONEDA = v_id_moneda_usd THEN h2.MONTO_CALCULADO * cp3.TIPO_CAMBIO
                               ELSE h2.MONTO_CALCULADO / cp3.TIPO_CAMBIO END
                      )
                 FROM RRHH_CONTRATO_HORAS h2
                 JOIN RRHH_CONTRATO_PROYECTO cp3 ON cp3.ID_CONTRATO_PROYECTO = h2.ID_CONTRATO_PROYECTO
                WHERE cp3.ID_PROYECTO = p.ID_PROYECTO
                  AND (
                      h2.ID_MOVIMIENTO IS NOT NULL
                      OR EXISTS (
                          SELECT 1 FROM PASIVO ps6
                            JOIN MAESTRO_MAESTRO ep6 ON ep6.ID_MAESTRO = ps6.ID_ESTADO_PASIVO
                           WHERE ps6.TIPO_REFERENCIA = 'RRHH_CONTRATO_HORAS' AND ps6.ID_REFERENCIA = h2.ID_CONTRATO_HORAS
                             AND ep6.CODIGO != 'ANULADO'
                      )
                  )
           ), 0) AS COSTO_MANO_OBRA_HORAS_PAGADO,
           COALESCE((
               SELECT SUM(
                          CASE WHEN rc3.ID_MONEDA = p.ID_MONEDA THEN mv.MONTO
                               WHEN rc3.TIPO_CAMBIO IS NULL THEN mv.MONTO
                               WHEN rc3.ID_MONEDA = v_id_moneda_usd THEN mv.MONTO * rc3.TIPO_CAMBIO
                               ELSE mv.MONTO / rc3.TIPO_CAMBIO END
                      )
                 FROM CUENTA_MOVIMIENTO mv
                 JOIN MAESTRO_MAESTRO tm ON tm.ID_MAESTRO = mv.ID_TIPO_MOVIMIENTO
                 JOIN RRHH_CONTRATO rc3 ON rc3.ID_CONTRATO = mv.ID_REFERENCIA
                 JOIN MAESTRO_MAESTRO tpl3 ON tpl3.ID_MAESTRO = rc3.ID_TIPO_PAGO_LOCADOR
                WHERE mv.TIPO_REFERENCIA = 'RRHH_CONTRATO' AND tm.CODIGO = 'EGRESO'
                  AND rc3.ID_PROYECTO = p.ID_PROYECTO AND tpl3.CODIGO = 'POR_PROYECTO'
           ), 0) AS COSTO_MANO_OBRA_TARIFA_UNICA_PAGADO,
           COALESCE((
               SELECT SUM(
                          CASE WHEN pgr2.ID_MONEDA = p.ID_MONEDA THEN pgi2.MONTO
                               WHEN pgr2.TIPO_CAMBIO IS NULL THEN pgi2.MONTO
                               WHEN pgr2.ID_MONEDA = v_id_moneda_usd THEN pgi2.MONTO * pgr2.TIPO_CAMBIO
                               ELSE pgi2.MONTO / pgr2.TIPO_CAMBIO END
                      )
                 FROM PAGO_RECURRENTE_INSTANCIA pgi2
                 JOIN PAGO_RECURRENTE pgr2 ON pgr2.ID_PAGO_RECURRENTE = pgi2.ID_PAGO_RECURRENTE
                WHERE pgr2.ID_PROYECTO = p.ID_PROYECTO
                  AND (
                      pgi2.ID_MOVIMIENTO IS NOT NULL
                      OR EXISTS (
                          SELECT 1 FROM PASIVO ps7
                            JOIN MAESTRO_MAESTRO ep7 ON ep7.ID_MAESTRO = ps7.ID_ESTADO_PASIVO
                           WHERE ps7.TIPO_REFERENCIA = 'PAGO_RECURRENTE_INSTANCIA' AND ps7.ID_REFERENCIA = pgi2.ID_INSTANCIA
                             AND ep7.CODIGO != 'ANULADO'
                      )
                  )
           ), 0) AS COSTO_PAGOS_RECURRENTES_PAGADO,
           COALESCE((
               SELECT SUM(
                          CASE WHEN i.ID_MONEDA = p.ID_MONEDA THEN i.MONTO
                               WHEN i.TIPO_CAMBIO IS NULL THEN i.MONTO
                               WHEN i.ID_MONEDA = v_id_moneda_usd THEN i.MONTO * i.TIPO_CAMBIO
                               ELSE i.MONTO / i.TIPO_CAMBIO END
                      )
                 FROM PROYECTO_INGRESO i WHERE i.ID_PROYECTO = p.ID_PROYECTO
           ), 0) AS INGRESO_REAL,
           COALESCE((
               SELECT SUM(h.MONTO) FROM PROYECTO_HITO h
                 JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
                WHERE h.ID_PROYECTO = p.ID_PROYECTO AND eh.CODIGO IN ('PLANEADO', 'FACTURADO')
           ), 0) AS MONTO_PLAN_PENDIENTE,
           COALESCE((
               SELECT SUM(h.MONTO) FROM PROYECTO_HITO h
                 JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
                WHERE h.ID_PROYECTO = p.ID_PROYECTO AND eh.CODIGO IN ('FACTURADO', 'COBRADO')
           ), 0) AS MONTO_FACTURADO,
           COALESCE((
               SELECT SUM(
                          CASE WHEN ps5.ID_MONEDA = p.ID_MONEDA THEN ps5.MONTO_TOTAL
                               WHEN ps5.TIPO_CAMBIO IS NULL THEN ps5.MONTO_TOTAL
                               WHEN ps5.ID_MONEDA = v_id_moneda_usd THEN ps5.MONTO_TOTAL * ps5.TIPO_CAMBIO
                               ELSE ps5.MONTO_TOTAL / ps5.TIPO_CAMBIO END
                      )
                 FROM PASIVO ps5
                 JOIN MAESTRO_MAESTRO ep5 ON ep5.ID_MAESTRO = ps5.ID_ESTADO_PASIVO
                WHERE ps5.ID_PROYECTO = p.ID_PROYECTO AND ep5.CODIGO != 'ANULADO'
           ), 0) AS PASIVO_GENERADO
      FROM PROYECTO p
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PROYECTO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PROYECTO
      LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = p.ID_CLIENTE
     WHERE p.ID_PROYECTO = p_id_proyecto;
END$$

-- Tipo y moneda no se editan una vez creado (mismo criterio que
-- SP_CUENTA_ACTUALIZAR/SP_PASIVO_ACTUALIZAR).
CREATE PROCEDURE SP_PROYECTO_ACTUALIZAR(
    IN p_id_proyecto INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_id_cliente INT UNSIGNED,
    IN p_es_interno TINYINT,
    IN p_descripcion VARCHAR(300),
    IN p_fecha_fin_estimada DATE,
    IN p_costo_presupuestado DECIMAL(14,2),
    IN p_ingreso_esperado DECIMAL(14,2),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_cliente INT UNSIGNED;
    SET v_id_cliente = IF(p_es_interno = 1, NULL, p_id_cliente);

    UPDATE PROYECTO
       SET NOMBRE = p_nombre,
           ID_CLIENTE = v_id_cliente,
           ES_INTERNO = p_es_interno,
           DESCRIPCION = p_descripcion,
           FECHA_FIN_ESTIMADA = p_fecha_fin_estimada,
           COSTO_PRESUPUESTADO = p_costo_presupuestado,
           INGRESO_ESPERADO = p_ingreso_esperado,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_PROYECTO = p_id_proyecto;
END$$

CREATE PROCEDURE SP_PROYECTO_CAMBIAR_ESTADO(
    IN p_id_proyecto INT UNSIGNED,
    IN p_codigo_estado VARCHAR(20),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_estado_proyecto INT UNSIGNED;
    SET v_id_estado_proyecto = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PROYECTO' AND CODIGO = p_codigo_estado LIMIT 1);

    UPDATE PROYECTO
       SET ID_ESTADO_PROYECTO = v_id_estado_proyecto, USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_PROYECTO = p_id_proyecto;
END$$

-- p_id_moneda es opcional -- si llega NULL se usa la moneda del proyecto
-- (asi el flujo de "Cobrar" un item del plan de facturacion, que siempre
-- cobra en la moneda del proyecto, no tiene que resolverla por su
-- cuenta). p_tipo_cambio: obligatorio SOLO si p_id_moneda llega y es
-- distinta a la del proyecto -- no-op silencioso si falta, mismo estilo
-- que SP_PROYECTO_COSTO_MANO_OBRA_AGREGAR. Ver 031_tipo_cambio_proyecto.sql.
CREATE PROCEDURE SP_PROYECTO_INGRESO_AGREGAR(
    IN p_id_proyecto INT UNSIGNED,
    IN p_fecha DATE,
    IN p_monto DECIMAL(14,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_concepto VARCHAR(250),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_ingreso INT UNSIGNED
)
BEGIN
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_id_moneda INT UNSIGNED;
    DECLARE v_requiere_tc TINYINT;

    SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
    SET v_id_moneda = COALESCE(p_id_moneda, v_id_moneda_proyecto);
    SET v_requiere_tc = IF(v_id_moneda != v_id_moneda_proyecto, 1, 0);

    IF NOT (v_requiere_tc = 1 AND p_tipo_cambio IS NULL) THEN
        INSERT INTO PROYECTO_INGRESO (ID_PROYECTO, FECHA, MONTO, ID_MONEDA, TIPO_CAMBIO, CONCEPTO, USUARIO_CREACION)
        VALUES (p_id_proyecto, p_fecha, p_monto, v_id_moneda, IF(v_requiere_tc = 1, p_tipo_cambio, NULL), p_concepto, p_id_usuario_creacion);

        SET p_id_ingreso = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_PROYECTO_INGRESO_LISTAR(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    SELECT i.ID_INGRESO, i.ID_PROYECTO, i.FECHA, i.MONTO, i.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, i.TIPO_CAMBIO, i.CONCEPTO, i.FECHA_CREACION
      FROM PROYECTO_INGRESO i
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = i.ID_MONEDA
     WHERE i.ID_PROYECTO = p_id_proyecto
     ORDER BY FECHA DESC, ID_INGRESO DESC;
END$$

-- No-op silencioso si el ingreso ya esta enlazado a un item del plan de
-- facturacion (PROYECTO_HITO.ID_INGRESO, puesto ahi por "Cobrar") --
-- borrarlo rompería la trazabilidad de que item ya se cobro. Mismo
-- criterio que SP_PASIVO_CUOTA_ELIMINAR/SP_PROYECTO_HITO_ELIMINAR.
CREATE PROCEDURE SP_PROYECTO_INGRESO_ELIMINAR(
    IN p_id_ingreso INT UNSIGNED
)
BEGIN
    DELETE pi FROM PROYECTO_INGRESO pi
     WHERE pi.ID_INGRESO = p_id_ingreso
       AND NOT EXISTS (
           SELECT 1 FROM PROYECTO_HITO h WHERE h.ID_INGRESO = pi.ID_INGRESO
       );
END$$

-- La persona es exactamente una de dos fuentes: un contrato de RRHH o un
-- proveedor persona natural (nunca las dos, nunca ninguna) -- no-op
-- silencioso si no se cumple, mismo estilo del resto del sistema (no se
-- usa SIGNAL en ningun procedimiento). Ademas:
-- - Si p_id_contrato ya tiene un contrato-por-hora enlazado a este mismo
--   proyecto (RRHH_CONTRATO_PROYECTO.ID_PROYECTO), su costo ya se cuenta
--   solo via horas -- no se inserta la asignacion manual duplicada.
-- - Si p_id_contrato es un locador "por proyecto" ya enlazado a este
--   mismo proyecto (RRHH_CONTRATO.ID_PROYECTO), su tarifa ya se cuenta
--   sola (ver COSTO_MANO_OBRA_TARIFA_UNICA en SP_PROYECTO_LISTAR/OBTENER)
--   -- misma logica, no se duplica.
-- - Si p_id_proveedor no esta marcado ES_PERSONA_NATURAL = 1, no se
--   inserta (un proveedor-empresa no es "mano de obra").
-- - p_tipo_cambio: obligatorio SOLO si p_id_moneda es distinta a la
--   moneda del proyecto (ID_PROYECTO es NOT NULL en esta tabla, siempre
--   hay un proyecto de referencia) -- no-op silencioso si falta, mismo
--   estilo que el resto de guards de este procedimiento. Cuando las
--   monedas coinciden se guarda NULL (no hace falta convertir). Ver
--   031_tipo_cambio_proyecto.sql para el porque.
CREATE PROCEDURE SP_PROYECTO_COSTO_MANO_OBRA_AGREGAR(
    IN p_id_proyecto INT UNSIGNED,
    IN p_id_contrato INT UNSIGNED,
    IN p_id_proveedor INT UNSIGNED,
    IN p_periodo VARCHAR(100),
    IN p_monto DECIMAL(12,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_concepto VARCHAR(250),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_asignacion INT UNSIGNED
)
BEGIN
    DECLARE v_ya_enlazado_por_horas INT;
    DECLARE v_ya_enlazado_tarifa_unica INT;
    DECLARE v_proveedor_valido INT;
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_requiere_tc TINYINT;
    SET v_ya_enlazado_por_horas = 0;
    SET v_ya_enlazado_tarifa_unica = 0;
    SET v_proveedor_valido = 1;

    SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
    SET v_requiere_tc = IF(p_id_moneda != v_id_moneda_proyecto, 1, 0);

    IF p_id_contrato IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ya_enlazado_por_horas
          FROM RRHH_CONTRATO_PROYECTO
         WHERE ID_CONTRATO = p_id_contrato AND ID_PROYECTO = p_id_proyecto;

        SELECT COUNT(*) INTO v_ya_enlazado_tarifa_unica
          FROM RRHH_CONTRATO rc
          JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = rc.ID_TIPO_PAGO_LOCADOR
         WHERE rc.ID_CONTRATO = p_id_contrato AND rc.ID_PROYECTO = p_id_proyecto AND tpl.CODIGO = 'POR_PROYECTO';
    END IF;

    IF p_id_proveedor IS NOT NULL THEN
        SELECT COUNT(*) INTO v_proveedor_valido
          FROM PROVEEDOR
         WHERE ID_PROVEEDOR = p_id_proveedor AND ES_PERSONA_NATURAL = 1;
    END IF;

    IF ((p_id_contrato IS NOT NULL) XOR (p_id_proveedor IS NOT NULL))
       AND v_ya_enlazado_por_horas = 0
       AND v_ya_enlazado_tarifa_unica = 0
       AND v_proveedor_valido = 1
       AND NOT (v_requiere_tc = 1 AND p_tipo_cambio IS NULL) THEN
        INSERT INTO PROYECTO_COSTO_MANO_OBRA (
            ID_PROYECTO, ID_CONTRATO, ID_PROVEEDOR, PERIODO, MONTO, ID_MONEDA, TIPO_CAMBIO, CONCEPTO, USUARIO_CREACION
        ) VALUES (
            p_id_proyecto, p_id_contrato, p_id_proveedor, p_periodo, p_monto, p_id_moneda,
            IF(v_requiere_tc = 1, p_tipo_cambio, NULL), p_concepto, p_id_usuario_creacion
        );
        SET p_id_asignacion = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_PROYECTO_COSTO_MANO_OBRA_LISTAR(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    SELECT mo.ID_ASIGNACION, mo.ID_PROYECTO, mo.ID_CONTRATO, mo.ID_PROVEEDOR, mo.PERIODO,
           mo.MONTO, mo.ID_MONEDA, mon.CODIGO AS MONEDA_CODIGO, mo.TIPO_CAMBIO, mo.CONCEPTO, mo.FECHA_CREACION,
           mo.FECHA_PAGO, mo.ID_MOVIMIENTO,
           u.NOMBRES AS CONTRATO_NOMBRES, u.APELLIDOS AS CONTRATO_APELLIDOS,
           pr.RAZON_SOCIAL AS PROVEEDOR_RAZON_SOCIAL,
           EXISTS (
               SELECT 1 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'PROYECTO_COSTO_MANO_OBRA' AND ps.ID_REFERENCIA = mo.ID_ASIGNACION
                  AND ep.CODIGO != 'ANULADO'
           ) AS FINANCIADO_CON_PASIVO
      FROM PROYECTO_COSTO_MANO_OBRA mo
      LEFT JOIN RRHH_CONTRATO rc ON rc.ID_CONTRATO = mo.ID_CONTRATO
      LEFT JOIN USUARIO u ON u.ID_USUARIO = rc.ID_USUARIO
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = mo.ID_PROVEEDOR
      JOIN MAESTRO_MAESTRO mon ON mon.ID_MAESTRO = mo.ID_MONEDA
     WHERE mo.ID_PROYECTO = p_id_proyecto
     ORDER BY mo.FECHA_CREACION DESC, mo.ID_ASIGNACION DESC;
END$$

CREATE PROCEDURE SP_PROYECTO_COSTO_MANO_OBRA_ELIMINAR(
    IN p_id_asignacion INT UNSIGNED
)
BEGIN
    DELETE FROM PROYECTO_COSTO_MANO_OBRA WHERE ID_ASIGNACION = p_id_asignacion;
END$$

-- No-op silencioso si la asignacion ya estaba pagada (ID_MOVIMIENTO no
-- nulo) -- mismo criterio que SP_PASIVO_CUOTA_MARCAR_PAGADA. p_fecha_pago
-- llega del formulario (no CURDATE()) para poder registrar pagos con
-- fecha retroactiva, igual que SP_COMPRA_PAGO_REGISTRAR.
CREATE PROCEDURE SP_PROYECTO_COSTO_MANO_OBRA_MARCAR_PAGADA(
    IN p_id_asignacion INT UNSIGNED,
    IN p_id_movimiento INT UNSIGNED,
    IN p_fecha_pago DATE
)
BEGIN
    UPDATE PROYECTO_COSTO_MANO_OBRA
       SET FECHA_PAGO = p_fecha_pago, ID_MOVIMIENTO = p_id_movimiento
     WHERE ID_ASIGNACION = p_id_asignacion AND ID_MOVIMIENTO IS NULL;
END$$

-- Cross-proyecto, para Cuentas por Pagar. Excluye asignaciones ya
-- pagadas o financiadas con un pasivo.
CREATE PROCEDURE SP_PROYECTO_COSTO_MANO_OBRA_LISTAR_PENDIENTES()
BEGIN
    SELECT mo.ID_ASIGNACION, mo.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE, mo.PERIODO,
           mo.MONTO, mo.ID_MONEDA, mon.CODIGO AS MONEDA_CODIGO, mo.FECHA_CREACION,
           COALESCE(CONCAT(u.NOMBRES, ' ', u.APELLIDOS), pr.RAZON_SOCIAL, 'Persona') AS PERSONA
      FROM PROYECTO_COSTO_MANO_OBRA mo
      JOIN PROYECTO py ON py.ID_PROYECTO = mo.ID_PROYECTO
      JOIN MAESTRO_MAESTRO mon ON mon.ID_MAESTRO = mo.ID_MONEDA
      LEFT JOIN RRHH_CONTRATO rc ON rc.ID_CONTRATO = mo.ID_CONTRATO
      LEFT JOIN USUARIO u ON u.ID_USUARIO = rc.ID_USUARIO
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = mo.ID_PROVEEDOR
     WHERE mo.ID_MOVIMIENTO IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM PASIVO ps
             JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
            WHERE ps.TIPO_REFERENCIA = 'PROYECTO_COSTO_MANO_OBRA' AND ps.ID_REFERENCIA = mo.ID_ASIGNACION
              AND ep.CODIGO != 'ANULADO'
       )
     ORDER BY mo.FECHA_CREACION;
END$$

-- Desglose por persona del costo de mano de obra por horas de este
-- proyecto -- COSTO_MANO_OBRA_HORAS (SP_PROYECTO_LISTAR/OBTENER) solo
-- trae el total agregado, esto trae fila por fila (una por periodo de
-- horas cargado) con quien la genero, para poder verla en el detalle del
-- proyecto igual que ya se ve "Mano de obra (asignacion manual)". Pagar/
-- financiar sigue siendo solo desde el detalle del contrato
-- (/rrhh/contratos/[id], PagarHorasContratoFila/FinanciarConPrestamoFila)
-- -- aca es de solo lectura, con un link a esa pantalla para gestionar.
CREATE PROCEDURE SP_PROYECTO_MANO_OBRA_HORAS_LISTAR(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    SELECT h.ID_CONTRATO_HORAS, h.ID_CONTRATO_PROYECTO, cp.ID_CONTRATO,
           u.NOMBRES, u.APELLIDOS,
           h.PERIODO, h.HORAS, h.MONTO_CALCULADO,
           cp.ID_MONEDA, mon.CODIGO AS MONEDA_CODIGO, cp.TIPO_CAMBIO,
           h.FECHA_CREACION, h.FECHA_PAGO, h.ID_MOVIMIENTO,
           EXISTS (
               SELECT 1 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'RRHH_CONTRATO_HORAS' AND ps.ID_REFERENCIA = h.ID_CONTRATO_HORAS
                  AND ep.CODIGO != 'ANULADO'
           ) AS FINANCIADO_CON_PASIVO
      FROM RRHH_CONTRATO_HORAS h
      JOIN RRHH_CONTRATO_PROYECTO cp ON cp.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
      JOIN MAESTRO_MAESTRO mon ON mon.ID_MAESTRO = cp.ID_MONEDA
      JOIN RRHH_CONTRATO c ON c.ID_CONTRATO = cp.ID_CONTRATO
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
     WHERE cp.ID_PROYECTO = p_id_proyecto
     ORDER BY h.FECHA_CREACION DESC;
END$$

-- Plan de facturacion: si p_porcentaje no es NULL, el monto se calcula
-- una sola vez contra el INGRESO_ESPERADO del proyecto y queda fijo
-- (no se recalcula si el ingreso esperado cambia despues) -- mismo
-- criterio que PASIVO_CUOTA.MONTO. Si p_porcentaje es NULL, se usa
-- p_monto_fijo directo.
CREATE PROCEDURE SP_PROYECTO_HITO_AGREGAR(
    IN p_id_proyecto INT UNSIGNED,
    IN p_id_tipo_hito INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_porcentaje DECIMAL(5,2),
    IN p_monto_fijo DECIMAL(14,2),
    IN p_fecha_estimada DATE,
    IN p_orden INT,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_hito INT UNSIGNED
)
BEGIN
    DECLARE v_id_planeado INT UNSIGNED;
    DECLARE v_ingreso_esperado DECIMAL(14,2);
    DECLARE v_monto DECIMAL(14,2);
    SET v_id_planeado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_HITO_FACTURACION' AND CODIGO = 'PLANEADO' LIMIT 1);

    IF p_porcentaje IS NOT NULL THEN
        SELECT INGRESO_ESPERADO INTO v_ingreso_esperado FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
        SET v_monto = ROUND(v_ingreso_esperado * p_porcentaje / 100, 2);
    ELSE
        SET v_monto = p_monto_fijo;
    END IF;

    INSERT INTO PROYECTO_HITO (
        ID_PROYECTO, ID_TIPO_HITO, NOMBRE, PORCENTAJE, MONTO, FECHA_ESTIMADA, ORDEN, ID_ESTADO_HITO, USUARIO_CREACION
    ) VALUES (
        p_id_proyecto, p_id_tipo_hito, p_nombre, p_porcentaje, v_monto, p_fecha_estimada, p_orden, v_id_planeado, p_id_usuario_creacion
    );

    SET p_id_hito = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_PROYECTO_HITO_LISTAR(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    SELECT h.ID_HITO, h.ID_PROYECTO, h.NOMBRE, h.PORCENTAJE, h.MONTO, h.FECHA_ESTIMADA, h.ORDEN,
           h.NRO_FACTURA, h.FECHA_FACTURADO, h.ID_INGRESO,
           h.ID_TIPO_HITO, th.CODIGO AS TIPO_HITO_CODIGO, th.DESCRIPCION AS TIPO_HITO_DESCRIPCION,
           h.ID_ESTADO_HITO, eh.CODIGO AS ESTADO_HITO_CODIGO, eh.DESCRIPCION AS ESTADO_HITO_DESCRIPCION
      FROM PROYECTO_HITO h
      JOIN MAESTRO_MAESTRO th ON th.ID_MAESTRO = h.ID_TIPO_HITO
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
     WHERE h.ID_PROYECTO = p_id_proyecto
     ORDER BY h.ORDEN, h.ID_HITO;
END$$

-- Cross-proyecto, para Cuentas por Cobrar -- mismas columnas que
-- SP_PROYECTO_HITO_LISTAR mas PROYECTO_NOMBRE, para poder reusar
-- HitoFilaAcciones.tsx tal cual (ya recibe idProyecto/nombreProyecto/hito
-- por separado).
CREATE PROCEDURE SP_PROYECTO_HITO_LISTAR_PENDIENTES()
BEGIN
    SELECT h.ID_HITO, h.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE, h.NOMBRE, h.PORCENTAJE, h.MONTO, h.FECHA_ESTIMADA, h.ORDEN,
           h.NRO_FACTURA, h.FECHA_FACTURADO, h.ID_INGRESO,
           h.ID_TIPO_HITO, th.CODIGO AS TIPO_HITO_CODIGO, th.DESCRIPCION AS TIPO_HITO_DESCRIPCION,
           h.ID_ESTADO_HITO, eh.CODIGO AS ESTADO_HITO_CODIGO, eh.DESCRIPCION AS ESTADO_HITO_DESCRIPCION
      FROM PROYECTO_HITO h
      JOIN PROYECTO py ON py.ID_PROYECTO = h.ID_PROYECTO
      JOIN MAESTRO_MAESTRO th ON th.ID_MAESTRO = h.ID_TIPO_HITO
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
     WHERE eh.CODIGO IN ('PLANEADO', 'FACTURADO')
     ORDER BY h.FECHA_ESTIMADA IS NULL, h.FECHA_ESTIMADA;
END$$

-- Cross-proyecto, para la seccion "IGV pendiente de declarar" de la
-- cuenta IGV_FAVOR (`/facturacion/cuentas/[id]`) -- items FACTURADO/
-- COBRADO de TODOS los proyectos (misma obligacion tributaria que ya
-- calcula "IGV por declarar a SUNAT" por proyecto, aca sin filtrar por
-- uno solo). Trae MONEDA_CODIGO del proyecto en vez de convertir aca --
-- el 18% de IGV y la conversion a soles con el TC vigente de Ventas se
-- calculan en la app (src/lib/proyectos/impuestos.ts), no en el
-- procedimiento, mismo criterio que el resto de este calculo (matematica
-- pura de visualizacion, no persiste nada).
CREATE PROCEDURE SP_PROYECTO_HITO_LISTAR_IGV_PENDIENTE()
BEGIN
    SELECT h.ID_HITO, h.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE,
           h.MONTO, m.CODIGO AS MONEDA_CODIGO,
           eh.CODIGO AS ESTADO_HITO_CODIGO, h.FECHA_FACTURADO
      FROM PROYECTO_HITO h
      JOIN PROYECTO py ON py.ID_PROYECTO = h.ID_PROYECTO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = py.ID_MONEDA
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
     WHERE eh.CODIGO IN ('FACTURADO', 'COBRADO')
     ORDER BY h.FECHA_FACTURADO;
END$$

-- Guard: solo se puede marcar facturado un item que sigue PLANEADO.
CREATE PROCEDURE SP_PROYECTO_HITO_MARCAR_FACTURADO(
    IN p_id_hito INT UNSIGNED,
    IN p_nro_factura VARCHAR(30),
    IN p_fecha_facturado DATE
)
BEGIN
    DECLARE v_id_facturado INT UNSIGNED;
    SET v_id_facturado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_HITO_FACTURACION' AND CODIGO = 'FACTURADO' LIMIT 1);

    UPDATE PROYECTO_HITO h
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
       SET h.ID_ESTADO_HITO = v_id_facturado, h.NRO_FACTURA = p_nro_factura, h.FECHA_FACTURADO = p_fecha_facturado
     WHERE h.ID_HITO = p_id_hito AND eh.CODIGO = 'PLANEADO';
END$$

-- Se llama despues de agregarIngresoProyecto (que ya crea el
-- PROYECTO_INGRESO) -- ver nota del flujo en dos pasos en el archivo de
-- Pasivos. Acepta items en PLANEADO o FACTURADO (se puede cobrar sin
-- pasar por "facturado" si el flujo fue informal).
CREATE PROCEDURE SP_PROYECTO_HITO_MARCAR_COBRADO(
    IN p_id_hito INT UNSIGNED,
    IN p_id_ingreso INT UNSIGNED
)
BEGIN
    DECLARE v_id_cobrado INT UNSIGNED;
    SET v_id_cobrado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_HITO_FACTURACION' AND CODIGO = 'COBRADO' LIMIT 1);

    UPDATE PROYECTO_HITO h
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
       SET h.ID_ESTADO_HITO = v_id_cobrado, h.ID_INGRESO = p_id_ingreso
     WHERE h.ID_HITO = p_id_hito AND eh.CODIGO IN ('PLANEADO', 'FACTURADO');
END$$

-- Deshace un "Cobrar": vuelve el hito a FACTURADO (si ya tenia NRO_FACTURA/
-- FECHA_FACTURADO, es decir paso por ahi antes de cobrarse) o a PLANEADO
-- (si se cobro directo), y suelta el enlace ID_INGRESO -- el PROYECTO_INGRESO
-- real que quedaba enlazado se borra despues desde la app, llamando a
-- SP_PROYECTO_INGRESO_ELIMINAR con el ID que devuelve este procedimiento
-- (esa SP ya rechaza borrar un ingreso todavia enlazado a un hito, por
-- eso el orden importa: primero soltar el enlace aca, recien despues
-- borrar el ingreso). No-op silencioso si el hito no esta COBRADO
-- (p_id_ingreso queda NULL).
CREATE PROCEDURE SP_PROYECTO_HITO_DESHACER_COBRO(
    IN p_id_hito INT UNSIGNED,
    OUT p_id_ingreso INT UNSIGNED
)
BEGIN
    DECLARE v_id_facturado INT UNSIGNED;
    DECLARE v_id_planeado INT UNSIGNED;
    DECLARE v_nro_factura VARCHAR(30);

    SET v_id_facturado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_HITO_FACTURACION' AND CODIGO = 'FACTURADO' LIMIT 1);
    SET v_id_planeado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_HITO_FACTURACION' AND CODIGO = 'PLANEADO' LIMIT 1);

    SELECT h.ID_INGRESO, h.NRO_FACTURA INTO p_id_ingreso, v_nro_factura
      FROM PROYECTO_HITO h
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
     WHERE h.ID_HITO = p_id_hito AND eh.CODIGO = 'COBRADO';

    IF p_id_ingreso IS NOT NULL THEN
        UPDATE PROYECTO_HITO
           SET ID_ESTADO_HITO = IF(v_nro_factura IS NOT NULL, v_id_facturado, v_id_planeado), ID_INGRESO = NULL
         WHERE ID_HITO = p_id_hito;
    END IF;
END$$

-- Un item ya facturado/cobrado no se anula (es historial real) -- solo
-- mientras sigue PLANEADO.
CREATE PROCEDURE SP_PROYECTO_HITO_ANULAR(
    IN p_id_hito INT UNSIGNED
)
BEGIN
    DECLARE v_id_anulado INT UNSIGNED;
    SET v_id_anulado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_HITO_FACTURACION' AND CODIGO = 'ANULADO' LIMIT 1);

    UPDATE PROYECTO_HITO h
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
       SET h.ID_ESTADO_HITO = v_id_anulado
     WHERE h.ID_HITO = p_id_hito AND eh.CODIGO = 'PLANEADO';
END$$

-- Borrado real solo mientras sigue PLANEADO (corregir un item antes de
-- que tenga historial real), mismo criterio que SP_PASIVO_CUOTA_ELIMINAR.
CREATE PROCEDURE SP_PROYECTO_HITO_ELIMINAR(
    IN p_id_hito INT UNSIGNED
)
BEGIN
    DELETE h FROM PROYECTO_HITO h
      JOIN MAESTRO_MAESTRO eh ON eh.ID_MAESTRO = h.ID_ESTADO_HITO
     WHERE h.ID_HITO = p_id_hito AND eh.CODIGO = 'PLANEADO';
END$$

-- Ledger combinado de ingresos y salidas del proyecto -- junta las
-- cuatro fuentes que hoy solo se ven como totales agregados (PROYECTO_INGRESO,
-- pagos de COMPRA vinculadas, asignaciones manuales de mano de obra, y
-- horas de locador por hora enlazadas), para poder ver el detalle
-- cronologico de "de donde sale y a donde entra la plata" del proyecto,
-- no solo el resumen. TIPO distingue el origen de cada fila (la app le
-- da signo: INGRESO positivo, los GASTO_* negativos).
--
-- Los tres GASTO_MANO_OBRA* solo muestran lo YA PAGADO (FECHA_PAGO), no
-- lo comprometido -- mismo criterio que GASTO_COMPRA, que sale de
-- COMPRA_PAGO (pago real) y no de la fecha en que se creo la COMPRA. Una
-- asignacion/hora/tarifa unica pendiente de pago sigue sumando al
-- costeo/Gastos como comprometido, pero no aparece aqui hasta pagarse --
-- este ledger es de caja real, no de compromiso.
--
-- INGRESO/GASTO_COMPRA/GASTO_MANO_OBRA convierten MONTO a la moneda del
-- proyecto con TIPO_CAMBIO cuando la fila esta en otra moneda (mismo
-- motivo que en SP_PROYECTO_LISTAR/OBTENER, ver 031_tipo_cambio_proyecto.sql
-- y 033_ingreso_moneda.sql). TIPO_CAMBIO siempre es "soles por dolar", asi
-- que la operacion depende de cual lado es el dolar (v_id_moneda_usd) --
-- multiplicar convierte dolares a soles, dividir convierte soles a
-- dolares -- no es un *TIPO_CAMBIO ciego para cualquier par de monedas.
-- Este ledger se muestra siempre bajo la moneda del proyecto, y el saldo
-- acumulado se calcula sumando estas filas en la app, asi que mezclar
-- monedas sin convertir (o convertir al reves) tambien corrompia ese
-- acumulado. Cuando hay conversion, el monto y la moneda originales
-- quedan anotados en CONCEPTO para que quede trazable.
CREATE PROCEDURE SP_PROYECTO_MOVIMIENTO_LISTAR(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_id_moneda_usd INT UNSIGNED;
    SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
    SET v_id_moneda_usd = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'MONEDA' AND CODIGO = 'USD' LIMIT 1);

    SELECT 'INGRESO' AS TIPO, i.FECHA,
           CASE WHEN i.ID_MONEDA = v_id_moneda_proyecto THEN i.MONTO
                WHEN i.TIPO_CAMBIO IS NULL THEN i.MONTO
                WHEN i.ID_MONEDA = v_id_moneda_usd THEN i.MONTO * i.TIPO_CAMBIO
                ELSE i.MONTO / i.TIPO_CAMBIO END AS MONTO,
           CONCAT(i.CONCEPTO,
                  IF(i.ID_MONEDA != v_id_moneda_proyecto, CONCAT(' (', mi.CODIGO, ' ', i.MONTO, ')'), '')) AS CONCEPTO
      FROM PROYECTO_INGRESO i
      JOIN MAESTRO_MAESTRO mi ON mi.ID_MAESTRO = i.ID_MONEDA
     WHERE i.ID_PROYECTO = p_id_proyecto

    UNION ALL

    SELECT 'GASTO_COMPRA' AS TIPO, cp.FECHA_PAGO AS FECHA,
           CASE WHEN c.ID_MONEDA = v_id_moneda_proyecto THEN cp.MONTO
                WHEN c.TIPO_CAMBIO IS NULL THEN cp.MONTO
                WHEN c.ID_MONEDA = v_id_moneda_usd THEN cp.MONTO * c.TIPO_CAMBIO
                ELSE cp.MONTO / c.TIPO_CAMBIO END AS MONTO,
           CONCAT('Compra: ', c.DESCRIPCION,
                  IF(c.ID_MONEDA != v_id_moneda_proyecto, CONCAT(' (', mc.CODIGO, ' ', cp.MONTO, ')'), '')) AS CONCEPTO
      FROM COMPRA_PAGO cp
      JOIN COMPRA c ON c.ID_COMPRA = cp.ID_COMPRA
      JOIN MAESTRO_MAESTRO mc ON mc.ID_MAESTRO = c.ID_MONEDA
     WHERE c.ID_PROYECTO = p_id_proyecto

    UNION ALL

    SELECT 'GASTO_MANO_OBRA' AS TIPO, mo.FECHA_PAGO AS FECHA,
           CASE WHEN mo.ID_MONEDA = v_id_moneda_proyecto THEN mo.MONTO
                WHEN mo.TIPO_CAMBIO IS NULL THEN mo.MONTO
                WHEN mo.ID_MONEDA = v_id_moneda_usd THEN mo.MONTO * mo.TIPO_CAMBIO
                ELSE mo.MONTO / mo.TIPO_CAMBIO END AS MONTO,
           CONCAT('Mano de obra: ', COALESCE(CONCAT(u.NOMBRES, ' ', u.APELLIDOS), pr.RAZON_SOCIAL, 'Persona'), ' - ', mo.PERIODO,
                  IF(mo.ID_MONEDA != v_id_moneda_proyecto, CONCAT(' (', mmo.CODIGO, ' ', mo.MONTO, ')'), '')) AS CONCEPTO
      FROM PROYECTO_COSTO_MANO_OBRA mo
      LEFT JOIN RRHH_CONTRATO rc ON rc.ID_CONTRATO = mo.ID_CONTRATO
      LEFT JOIN USUARIO u ON u.ID_USUARIO = rc.ID_USUARIO
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = mo.ID_PROVEEDOR
      JOIN MAESTRO_MAESTRO mmo ON mmo.ID_MAESTRO = mo.ID_MONEDA
     WHERE mo.ID_PROYECTO = p_id_proyecto AND mo.ID_MOVIMIENTO IS NOT NULL

    UNION ALL

    SELECT 'GASTO_MANO_OBRA_HORAS' AS TIPO, h.FECHA_PAGO AS FECHA,
           CASE WHEN cp2.ID_MONEDA = v_id_moneda_proyecto THEN h.MONTO_CALCULADO
                WHEN cp2.TIPO_CAMBIO IS NULL THEN h.MONTO_CALCULADO
                WHEN cp2.ID_MONEDA = v_id_moneda_usd THEN h.MONTO_CALCULADO * cp2.TIPO_CAMBIO
                ELSE h.MONTO_CALCULADO / cp2.TIPO_CAMBIO END AS MONTO,
           CONCAT('Horas: ', py2.NOMBRE, ' - ', h.PERIODO,
                  IF(cp2.ID_MONEDA != v_id_moneda_proyecto, CONCAT(' (', mcp2.CODIGO, ' ', h.MONTO_CALCULADO, ')'), '')) AS CONCEPTO
      FROM RRHH_CONTRATO_HORAS h
      JOIN RRHH_CONTRATO_PROYECTO cp2 ON cp2.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
      JOIN MAESTRO_MAESTRO mcp2 ON mcp2.ID_MAESTRO = cp2.ID_MONEDA
      JOIN PROYECTO py2 ON py2.ID_PROYECTO = cp2.ID_PROYECTO
     WHERE cp2.ID_PROYECTO = p_id_proyecto AND h.ID_MOVIMIENTO IS NOT NULL

    UNION ALL

    SELECT 'GASTO_MANO_OBRA_TARIFA_UNICA' AS TIPO, mv.FECHA_MOVIMIENTO AS FECHA,
           CASE WHEN rc.ID_MONEDA = v_id_moneda_proyecto THEN mv.MONTO
                WHEN rc.TIPO_CAMBIO IS NULL THEN mv.MONTO
                WHEN rc.ID_MONEDA = v_id_moneda_usd THEN mv.MONTO * rc.TIPO_CAMBIO
                ELSE mv.MONTO / rc.TIPO_CAMBIO END AS MONTO,
           CONCAT('Locador (tarifa unica): ', u2.NOMBRES, ' ', u2.APELLIDOS,
                  IF(rc.ID_MONEDA != v_id_moneda_proyecto, CONCAT(' (', mrc.CODIGO, ' ', mv.MONTO, ')'), '')) AS CONCEPTO
      FROM CUENTA_MOVIMIENTO mv
      JOIN MAESTRO_MAESTRO tm2 ON tm2.ID_MAESTRO = mv.ID_TIPO_MOVIMIENTO
      JOIN RRHH_CONTRATO rc ON rc.ID_CONTRATO = mv.ID_REFERENCIA
      JOIN MAESTRO_MAESTRO mrc ON mrc.ID_MAESTRO = rc.ID_MONEDA
      JOIN USUARIO u2 ON u2.ID_USUARIO = rc.ID_USUARIO
      JOIN MAESTRO_MAESTRO tpl2 ON tpl2.ID_MAESTRO = rc.ID_TIPO_PAGO_LOCADOR
     WHERE mv.TIPO_REFERENCIA = 'RRHH_CONTRATO' AND tm2.CODIGO = 'EGRESO'
       AND rc.ID_PROYECTO = p_id_proyecto AND tpl2.CODIGO = 'POR_PROYECTO'

    UNION ALL

    SELECT 'GASTO_PAGO_RECURRENTE' AS TIPO, pgi3.FECHA_PAGO AS FECHA,
           CASE WHEN pgr3.ID_MONEDA = v_id_moneda_proyecto THEN pgi3.MONTO
                WHEN pgr3.TIPO_CAMBIO IS NULL THEN pgi3.MONTO
                WHEN pgr3.ID_MONEDA = v_id_moneda_usd THEN pgi3.MONTO * pgr3.TIPO_CAMBIO
                ELSE pgi3.MONTO / pgr3.TIPO_CAMBIO END AS MONTO,
           CONCAT('Pago recurrente: ', pgr3.NOMBRE, ' - ', pgi3.PERIODO,
                  IF(pgr3.ID_MONEDA != v_id_moneda_proyecto, CONCAT(' (', mpgr3.CODIGO, ' ', pgi3.MONTO, ')'), '')) AS CONCEPTO
      FROM PAGO_RECURRENTE_INSTANCIA pgi3
      JOIN PAGO_RECURRENTE pgr3 ON pgr3.ID_PAGO_RECURRENTE = pgi3.ID_PAGO_RECURRENTE
      JOIN MAESTRO_MAESTRO mpgr3 ON mpgr3.ID_MAESTRO = pgr3.ID_MONEDA
     WHERE pgr3.ID_PROYECTO = p_id_proyecto AND pgi3.ID_MOVIMIENTO IS NOT NULL

    ORDER BY FECHA DESC;
END$$

-- =====================================================================
-- Botones "Reset" del detalle del proyecto -- para limpiar datos
-- cargados por error (ej. mientras se arma el costeo de un proyecto
-- nuevo) sin tener que borrar fila por fila. Deliberadamente incluyen
-- filas YA PAGADAS o financiadas con un pasivo (a diferencia del resto
-- del sistema, que en general protege lo que ya se movio) -- decision
-- explicita: son botones de correccion masiva, no de operacion diaria,
-- y la app los pide con permiso ADMIN + confirmacion, igual que
-- cambiarEstadoProyectoAction/anularPasivoAction. Un pasivo o
-- CUENTA_MOVIMIENTO ya creado nunca se borra aqui (son deuda/caja real)
-- -- solo se desvincula o se borra la fila de costeo que los origino, el
-- mismo comportamiento que ya tenian sus DELETE de una sola fila
-- (SP_PROYECTO_COSTO_MANO_OBRA_ELIMINAR/SP_RRHH_CONTRATO_PROYECTO_ELIMINAR
-- tampoco protegian lo pagado), esto solo lo aplica a todas las filas
-- del proyecto de una vez.
-- =====================================================================

-- Borra todo PROYECTO_INGRESO del proyecto -- salvo el que ya este
-- enlazado a un item COBRADO del plan de facturacion (PROYECTO_HITO.
-- ID_INGRESO tiene FK real a esta tabla, borrarlo rompería esa fila);
-- mismo guard que ya usaba SP_PROYECTO_INGRESO_ELIMINAR para una sola
-- fila.
CREATE PROCEDURE SP_PROYECTO_RESET_INGRESOS(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    DELETE pi FROM PROYECTO_INGRESO pi
     WHERE pi.ID_PROYECTO = p_id_proyecto
       AND NOT EXISTS (
           SELECT 1 FROM PROYECTO_HITO h WHERE h.ID_INGRESO = pi.ID_INGRESO
       );
END$$

-- No borra la COMPRA (no existe borrado de compras en ningun lado del
-- sistema, se tratan como registro financiero permanente) -- solo la
-- desvincula de este proyecto (ID_PROYECTO = NULL). La compra y su
-- historial de pagos/financiamiento siguen existiendo, solo dejan de
-- contar en el costeo de este proyecto.
CREATE PROCEDURE SP_PROYECTO_RESET_COMPRAS(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    UPDATE COMPRA SET ID_PROYECTO = NULL WHERE ID_PROYECTO = p_id_proyecto;
END$$

-- Limpia las tres fuentes de costo de mano de obra de un proyecto:
-- 1) Mano de obra manual (PROYECTO_COSTO_MANO_OBRA): se borra.
-- 2) Horas de locador por hora (RRHH_CONTRATO_PROYECTO): se desvincula
--    el contrato de este proyecto -- igual que SP_RRHH_CONTRATO_PROYECTO_ELIMINAR,
--    eso borra tambien las horas cargadas (RRHH_CONTRATO_HORAS), que no
--    tienen sentido sueltas sin su proyecto.
-- 3) Tarifa unica (RRHH_CONTRATO con TIPO_PAGO_LOCADOR='POR_PROYECTO'):
--    se desvincula el contrato (ID_PROYECTO = NULL) -- el contrato en si
--    no se borra, solo deja de sumar su TARIFA al costeo de este
--    proyecto.
CREATE PROCEDURE SP_PROYECTO_RESET_COSTOS_LABORALES(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    DELETE FROM PROYECTO_COSTO_MANO_OBRA WHERE ID_PROYECTO = p_id_proyecto;

    DELETE h FROM RRHH_CONTRATO_HORAS h
      JOIN RRHH_CONTRATO_PROYECTO cp ON cp.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
     WHERE cp.ID_PROYECTO = p_id_proyecto;
    DELETE FROM RRHH_CONTRATO_PROYECTO WHERE ID_PROYECTO = p_id_proyecto;

    UPDATE RRHH_CONTRATO rc
      JOIN MAESTRO_MAESTRO tpl ON tpl.ID_MAESTRO = rc.ID_TIPO_PAGO_LOCADOR
       SET rc.ID_PROYECTO = NULL
     WHERE rc.ID_PROYECTO = p_id_proyecto AND tpl.CODIGO = 'POR_PROYECTO';
END$$

DELIMITER ;
