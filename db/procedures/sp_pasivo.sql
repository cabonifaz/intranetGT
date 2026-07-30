-- =====================================================================
-- Procedimientos del modulo de pasivos: CRUD de PASIVO, sus cuotas
-- (PASIVO_CUOTA) y el listado que alimenta el plan de pagos.
--
-- El pago de una cuota NO se hace en una sola SP: se llama primero
-- SP_CUENTA_MOVIMIENTO_REGISTRAR (que abre su propia transaccion) desde
-- la capa de aplicacion, y con el ID_MOVIMIENTO resultante se llama
-- SP_PASIVO_CUOTA_MARCAR_PAGADA. MySQL no anida transacciones de verdad
-- (un START TRANSACTION dentro de otra ya abierta la cierra antes de
-- tiempo), asi que encadenar ambas SPs dentro de una sola transaccion
-- no es seguro -- se acepta el mismo nivel de riesgo que ya tiene hoy
-- el flujo de firma de contratos (varios pasos independientes sin
-- rollback entre si).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_PASIVO_CREAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_LISTAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_LISTAR_POR_PROYECTO;
DROP PROCEDURE IF EXISTS SP_PASIVO_OBTENER;
DROP PROCEDURE IF EXISTS SP_PASIVO_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_ANULAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_CUOTA_AGREGAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_CUOTA_LISTAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_CUOTA_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_CUOTA_MARCAR_PAGADA;
DROP PROCEDURE IF EXISTS SP_PASIVO_CUOTA_PROTESTAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_CUOTA_ANULAR;
DROP PROCEDURE IF EXISTS SP_PASIVO_CUOTA_LISTAR_PENDIENTES;

DELIMITER $$

-- El acreedor es exactamente una de tres fuentes -- un PROVEEDOR, un
-- contacto del Directorio (persona natural externa) o personal interno
-- de GT (ej. gerencia, referenciando USUARIO) -- nunca dos a la vez,
-- nunca ninguna. No-op silencioso si no se cumple (p_id_pasivo queda
-- NULL), mismo estilo que SP_PROYECTO_COSTO_MANO_OBRA_AGREGAR.
--
-- p_tipo_referencia/p_id_referencia (NULL para un pasivo normal, sin
-- financiar nada puntual) marcan que este pasivo ES el pago de una
-- compra/periodo de sueldo/horas/asignacion de mano de obra especifica
-- -- reemplaza el pago, no se mueve caja. p_id_proyecto se guarda
-- directo (no se deriva por join) porque no todo lo financiado tiene
-- proyecto. Si p_tipo_referencia='COMPRA', ademas recalcula
-- COMPRA.ID_ESTADO_COMPRA (mismo bloque que SP_COMPRA_PAGO_REGISTRAR,
-- sumando lo pagado en efectivo + lo financiado con pasivos) -- los
-- otros tipos de referencia no necesitan este paso porque sus tablas
-- ya calculan "pendiente" leyendo PASIVO directamente.
-- p_tipo_cambio: obligatorio SOLO si p_id_proyecto viene informado y su
-- moneda es distinta a p_id_moneda -- no-op silencioso si falta, mismo
-- estilo del resto del sistema. Ver 031_tipo_cambio_proyecto.sql.
CREATE PROCEDURE SP_PASIVO_CREAR(
    IN p_id_tipo_pasivo INT UNSIGNED,
    IN p_id_proveedor INT UNSIGNED,
    IN p_id_contacto INT UNSIGNED,
    IN p_id_usuario INT UNSIGNED,
    IN p_descripcion VARCHAR(300),
    IN p_nro_operacion VARCHAR(60),
    IN p_monto_total DECIMAL(14,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_tasa_interes DECIMAL(5,2),
    IN p_fecha_origen DATE,
    IN p_id_cuenta_pago INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    IN p_tipo_referencia VARCHAR(50),
    IN p_id_referencia INT UNSIGNED,
    IN p_id_proyecto INT UNSIGNED,
    OUT p_id_pasivo INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_estado_activo INT UNSIGNED;
    DECLARE v_cantidad_fuentes INT;
    DECLARE v_monto_total_compra DECIMAL(14,2);
    DECLARE v_monto_pagado DECIMAL(14,2);
    DECLARE v_monto_financiado DECIMAL(14,2);
    DECLARE v_id_estado_compra_nuevo INT UNSIGNED;
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_requiere_tc TINYINT;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_estado_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PASIVO' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_cantidad_fuentes = (IF(p_id_proveedor IS NOT NULL, 1, 0) + IF(p_id_contacto IS NOT NULL, 1, 0) + IF(p_id_usuario IS NOT NULL, 1, 0));
    SET v_requiere_tc = 0;

    IF p_id_proyecto IS NOT NULL THEN
        SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
        IF p_id_moneda != v_id_moneda_proyecto THEN
            SET v_requiere_tc = 1;
        END IF;
    END IF;

    IF v_cantidad_fuentes = 1 AND NOT (v_requiere_tc = 1 AND p_tipo_cambio IS NULL) THEN
        INSERT INTO PASIVO (
            ID_TIPO_PASIVO, ID_PROVEEDOR, ID_CONTACTO, ID_USUARIO, TIPO_REFERENCIA, ID_REFERENCIA, ID_PROYECTO,
            DESCRIPCION, NRO_OPERACION, MONTO_TOTAL, ID_MONEDA, TIPO_CAMBIO,
            TASA_INTERES, FECHA_ORIGEN, ID_CUENTA_PAGO, ID_ESTADO_PASIVO, ID_ESTADO, USUARIO_CREACION
        ) VALUES (
            p_id_tipo_pasivo, p_id_proveedor, p_id_contacto, p_id_usuario, p_tipo_referencia, p_id_referencia, p_id_proyecto,
            p_descripcion, p_nro_operacion, p_monto_total, p_id_moneda, IF(v_requiere_tc = 1, p_tipo_cambio, NULL),
            p_tasa_interes, p_fecha_origen, p_id_cuenta_pago, v_id_estado_activo, v_id_activo, p_id_usuario_creacion
        );

        SET p_id_pasivo = LAST_INSERT_ID();

        IF p_tipo_referencia = 'COMPRA' THEN
            SELECT MONTO_TOTAL INTO v_monto_total_compra FROM COMPRA WHERE ID_COMPRA = p_id_referencia;
            SELECT COALESCE(SUM(MONTO), 0) INTO v_monto_pagado FROM COMPRA_PAGO WHERE ID_COMPRA = p_id_referencia;
            SELECT COALESCE(SUM(ps.MONTO_TOTAL), 0) INTO v_monto_financiado
              FROM PASIVO ps
              JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
             WHERE ps.TIPO_REFERENCIA = 'COMPRA' AND ps.ID_REFERENCIA = p_id_referencia AND ep.CODIGO != 'ANULADO';

            SET v_id_estado_compra_nuevo = (
                SELECT ID_MAESTRO FROM MAESTRO_MAESTRO
                 WHERE TIPO_MAESTRO = 'ESTADO_COMPRA'
                   AND CODIGO = IF(v_monto_pagado + v_monto_financiado >= v_monto_total_compra, 'PAGADA', 'PARCIAL')
                 LIMIT 1
            );

            UPDATE COMPRA SET ID_ESTADO_COMPRA = v_id_estado_compra_nuevo WHERE ID_COMPRA = p_id_referencia;
        END IF;
    END IF;
END$$

-- MONTO_PENDIENTE: suma de cuotas que todavia representan una
-- obligacion (PENDIENTE/PROTESTADA) -- util para ver de un vistazo
-- cuanto falta de cada pasivo sin entrar al detalle.
--
-- FINANCIA_DESCRIPCION: TIPO_REFERENCIA/ID_REFERENCIA es una referencia
-- generica sin FK (a proposito, mismo criterio que CUENTA_MOVIMIENTO --
-- ver 030_pasivo_referencia_proyecto.sql), asi que mostrar solo
-- "COMPRA #123" no dice nada util sin entrar al detalle -- este CASE
-- resuelve cada uno de los 4 valores posibles (mismos que usa
-- FinanciarConPrestamoFila.tsx) a un texto legible: que compra, el
-- sueldo/honorario de quien y que periodo, las horas de quien y que
-- periodo, o la asignacion manual de mano de obra de quien y que
-- periodo. NULL para un pasivo normal sin financiar nada puntual
-- (TIPO_REFERENCIA es NULL en ese caso).
CREATE PROCEDURE SP_PASIVO_LISTAR(
    IN p_id_tipo_pasivo INT UNSIGNED,
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT p.ID_PASIVO, COALESCE(pr.RAZON_SOCIAL, CONCAT(dc.NOMBRES, ' ', dc.APELLIDOS), CONCAT(u.NOMBRES, ' ', u.APELLIDOS)) AS ACREEDOR,
           p.DESCRIPCION, p.MONTO_TOTAL, p.FECHA_ORIGEN,
           p.ID_TIPO_PASIVO, tp.CODIGO AS TIPO_PASIVO_CODIGO, tp.DESCRIPCION AS TIPO_PASIVO_DESCRIPCION,
           p.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION,
           p.ID_ESTADO_PASIVO, ep.CODIGO AS ESTADO_PASIVO_CODIGO, ep.DESCRIPCION AS ESTADO_PASIVO_DESCRIPCION,
           p.TIPO_REFERENCIA, p.ID_REFERENCIA,
           CASE p.TIPO_REFERENCIA
               WHEN 'COMPRA' THEN (
                   SELECT CONCAT('Compra: ', c.DESCRIPCION) FROM COMPRA c WHERE c.ID_COMPRA = p.ID_REFERENCIA
               )
               WHEN 'RRHH_CONTRATO_PERIODO_PAGO' THEN (
                   SELECT CONCAT('Sueldo/honorario: ', u2.NOMBRES, ' ', u2.APELLIDOS, ' - ', pp.PERIODO)
                     FROM RRHH_CONTRATO_PERIODO_PAGO pp
                     JOIN RRHH_CONTRATO rc2 ON rc2.ID_CONTRATO = pp.ID_CONTRATO
                     JOIN USUARIO u2 ON u2.ID_USUARIO = rc2.ID_USUARIO
                    WHERE pp.ID_PERIODO_PAGO = p.ID_REFERENCIA
               )
               WHEN 'RRHH_CONTRATO_HORAS' THEN (
                   SELECT CONCAT('Horas: ', u3.NOMBRES, ' ', u3.APELLIDOS, ' - ', h.PERIODO)
                     FROM RRHH_CONTRATO_HORAS h
                     JOIN RRHH_CONTRATO_PROYECTO cp3 ON cp3.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
                     JOIN RRHH_CONTRATO rc3 ON rc3.ID_CONTRATO = cp3.ID_CONTRATO
                     JOIN USUARIO u3 ON u3.ID_USUARIO = rc3.ID_USUARIO
                    WHERE h.ID_CONTRATO_HORAS = p.ID_REFERENCIA
               )
               WHEN 'PROYECTO_COSTO_MANO_OBRA' THEN (
                   SELECT CONCAT('Mano de obra: ', COALESCE(CONCAT(u4.NOMBRES, ' ', u4.APELLIDOS), pr4.RAZON_SOCIAL, 'Persona'), ' - ', mo.PERIODO)
                     FROM PROYECTO_COSTO_MANO_OBRA mo
                     LEFT JOIN RRHH_CONTRATO rc4 ON rc4.ID_CONTRATO = mo.ID_CONTRATO
                     LEFT JOIN USUARIO u4 ON u4.ID_USUARIO = rc4.ID_USUARIO
                     LEFT JOIN PROVEEDOR pr4 ON pr4.ID_PROVEEDOR = mo.ID_PROVEEDOR
                    WHERE mo.ID_ASIGNACION = p.ID_REFERENCIA
               )
               WHEN 'PAGO_RECURRENTE_INSTANCIA' THEN (
                   SELECT CONCAT('Pago recurrente: ', pr5.NOMBRE, ' - ', pri.PERIODO)
                     FROM PAGO_RECURRENTE_INSTANCIA pri
                     JOIN PAGO_RECURRENTE pr5 ON pr5.ID_PAGO_RECURRENTE = pri.ID_PAGO_RECURRENTE
                    WHERE pri.ID_INSTANCIA = p.ID_REFERENCIA
               )
               ELSE NULL
           END AS FINANCIA_DESCRIPCION,
           COALESCE((
               SELECT SUM(pc.MONTO) FROM PASIVO_CUOTA pc
                 JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
                WHERE pc.ID_PASIVO = p.ID_PASIVO AND ec.CODIGO IN ('PENDIENTE', 'PROTESTADA')
           ), 0) AS MONTO_PENDIENTE
      FROM PASIVO p
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PASIVO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PASIVO
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = p.ID_PROVEEDOR
      LEFT JOIN DIRECTORIO_CONTACTO_EXTERNO dc ON dc.ID_CONTACTO = p.ID_CONTACTO
      LEFT JOIN USUARIO u ON u.ID_USUARIO = p.ID_USUARIO
     WHERE (p_id_tipo_pasivo IS NULL OR p.ID_TIPO_PASIVO = p_id_tipo_pasivo)
       AND (p_solo_activos = 0 OR ep.CODIGO = 'ACTIVO')
     ORDER BY ep.CODIGO = 'ACTIVO' DESC, p.FECHA_ORIGEN DESC;
END$$

-- Mismo shape que SP_PASIVO_LISTAR (incluye MONTO_PENDIENTE), filtrado
-- por PASIVO.ID_PROYECTO -- para la seccion "Pasivos" del detalle de un
-- proyecto (030_pasivo_referencia_proyecto.sql). Incluye anulados/
-- cancelados (a diferencia de SP_PASIVO_LISTAR con p_solo_activos=1) para
-- que el historial completo de financiamiento del proyecto quede
-- visible, no solo lo vigente -- el estado ya se ve en la columna Estado.
CREATE PROCEDURE SP_PASIVO_LISTAR_POR_PROYECTO(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    SELECT p.ID_PASIVO, COALESCE(pr.RAZON_SOCIAL, CONCAT(dc.NOMBRES, ' ', dc.APELLIDOS), CONCAT(u.NOMBRES, ' ', u.APELLIDOS)) AS ACREEDOR,
           p.DESCRIPCION, p.MONTO_TOTAL, p.FECHA_ORIGEN,
           p.ID_TIPO_PASIVO, tp.CODIGO AS TIPO_PASIVO_CODIGO, tp.DESCRIPCION AS TIPO_PASIVO_DESCRIPCION,
           p.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION,
           p.ID_ESTADO_PASIVO, ep.CODIGO AS ESTADO_PASIVO_CODIGO, ep.DESCRIPCION AS ESTADO_PASIVO_DESCRIPCION,
           p.TIPO_REFERENCIA, p.ID_REFERENCIA,
           CASE p.TIPO_REFERENCIA
               WHEN 'COMPRA' THEN (
                   SELECT CONCAT('Compra: ', c.DESCRIPCION) FROM COMPRA c WHERE c.ID_COMPRA = p.ID_REFERENCIA
               )
               WHEN 'RRHH_CONTRATO_PERIODO_PAGO' THEN (
                   SELECT CONCAT('Sueldo/honorario: ', u2.NOMBRES, ' ', u2.APELLIDOS, ' - ', pp.PERIODO)
                     FROM RRHH_CONTRATO_PERIODO_PAGO pp
                     JOIN RRHH_CONTRATO rc2 ON rc2.ID_CONTRATO = pp.ID_CONTRATO
                     JOIN USUARIO u2 ON u2.ID_USUARIO = rc2.ID_USUARIO
                    WHERE pp.ID_PERIODO_PAGO = p.ID_REFERENCIA
               )
               WHEN 'RRHH_CONTRATO_HORAS' THEN (
                   SELECT CONCAT('Horas: ', u3.NOMBRES, ' ', u3.APELLIDOS, ' - ', h.PERIODO)
                     FROM RRHH_CONTRATO_HORAS h
                     JOIN RRHH_CONTRATO_PROYECTO cp3 ON cp3.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
                     JOIN RRHH_CONTRATO rc3 ON rc3.ID_CONTRATO = cp3.ID_CONTRATO
                     JOIN USUARIO u3 ON u3.ID_USUARIO = rc3.ID_USUARIO
                    WHERE h.ID_CONTRATO_HORAS = p.ID_REFERENCIA
               )
               WHEN 'PROYECTO_COSTO_MANO_OBRA' THEN (
                   SELECT CONCAT('Mano de obra: ', COALESCE(CONCAT(u4.NOMBRES, ' ', u4.APELLIDOS), pr4.RAZON_SOCIAL, 'Persona'), ' - ', mo.PERIODO)
                     FROM PROYECTO_COSTO_MANO_OBRA mo
                     LEFT JOIN RRHH_CONTRATO rc4 ON rc4.ID_CONTRATO = mo.ID_CONTRATO
                     LEFT JOIN USUARIO u4 ON u4.ID_USUARIO = rc4.ID_USUARIO
                     LEFT JOIN PROVEEDOR pr4 ON pr4.ID_PROVEEDOR = mo.ID_PROVEEDOR
                    WHERE mo.ID_ASIGNACION = p.ID_REFERENCIA
               )
               WHEN 'PAGO_RECURRENTE_INSTANCIA' THEN (
                   SELECT CONCAT('Pago recurrente: ', pr5.NOMBRE, ' - ', pri.PERIODO)
                     FROM PAGO_RECURRENTE_INSTANCIA pri
                     JOIN PAGO_RECURRENTE pr5 ON pr5.ID_PAGO_RECURRENTE = pri.ID_PAGO_RECURRENTE
                    WHERE pri.ID_INSTANCIA = p.ID_REFERENCIA
               )
               ELSE NULL
           END AS FINANCIA_DESCRIPCION,
           COALESCE((
               SELECT SUM(pc.MONTO) FROM PASIVO_CUOTA pc
                 JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
                WHERE pc.ID_PASIVO = p.ID_PASIVO AND ec.CODIGO IN ('PENDIENTE', 'PROTESTADA')
           ), 0) AS MONTO_PENDIENTE
      FROM PASIVO p
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PASIVO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PASIVO
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = p.ID_PROVEEDOR
      LEFT JOIN DIRECTORIO_CONTACTO_EXTERNO dc ON dc.ID_CONTACTO = p.ID_CONTACTO
      LEFT JOIN USUARIO u ON u.ID_USUARIO = p.ID_USUARIO
     WHERE p.ID_PROYECTO = p_id_proyecto
     ORDER BY ep.CODIGO = 'ACTIVO' DESC, p.FECHA_ORIGEN DESC;
END$$

CREATE PROCEDURE SP_PASIVO_OBTENER(
    IN p_id_pasivo INT UNSIGNED
)
BEGIN
    SELECT p.ID_PASIVO, p.ID_PROVEEDOR, p.ID_CONTACTO, p.ID_USUARIO,
           COALESCE(pr.RAZON_SOCIAL, CONCAT(dc.NOMBRES, ' ', dc.APELLIDOS), CONCAT(u.NOMBRES, ' ', u.APELLIDOS)) AS ACREEDOR,
           p.DESCRIPCION, p.NRO_OPERACION, p.MONTO_TOTAL,
           p.TASA_INTERES, p.FECHA_ORIGEN,
           p.ID_TIPO_PASIVO, tp.CODIGO AS TIPO_PASIVO_CODIGO, tp.DESCRIPCION AS TIPO_PASIVO_DESCRIPCION,
           p.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, m.DESCRIPCION AS MONEDA_DESCRIPCION, p.TIPO_CAMBIO,
           p.ID_CUENTA_PAGO, cu.NOMBRE AS CUENTA_PAGO_NOMBRE,
           p.ID_ESTADO_PASIVO, ep.CODIGO AS ESTADO_PASIVO_CODIGO, ep.DESCRIPCION AS ESTADO_PASIVO_DESCRIPCION,
           p.TIPO_REFERENCIA, p.ID_REFERENCIA,
           CASE p.TIPO_REFERENCIA
               WHEN 'COMPRA' THEN (
                   SELECT CONCAT('Compra: ', c.DESCRIPCION) FROM COMPRA c WHERE c.ID_COMPRA = p.ID_REFERENCIA
               )
               WHEN 'RRHH_CONTRATO_PERIODO_PAGO' THEN (
                   SELECT CONCAT('Sueldo/honorario: ', u2.NOMBRES, ' ', u2.APELLIDOS, ' - ', pp.PERIODO)
                     FROM RRHH_CONTRATO_PERIODO_PAGO pp
                     JOIN RRHH_CONTRATO rc2 ON rc2.ID_CONTRATO = pp.ID_CONTRATO
                     JOIN USUARIO u2 ON u2.ID_USUARIO = rc2.ID_USUARIO
                    WHERE pp.ID_PERIODO_PAGO = p.ID_REFERENCIA
               )
               WHEN 'RRHH_CONTRATO_HORAS' THEN (
                   SELECT CONCAT('Horas: ', u3.NOMBRES, ' ', u3.APELLIDOS, ' - ', h.PERIODO)
                     FROM RRHH_CONTRATO_HORAS h
                     JOIN RRHH_CONTRATO_PROYECTO cp3 ON cp3.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
                     JOIN RRHH_CONTRATO rc3 ON rc3.ID_CONTRATO = cp3.ID_CONTRATO
                     JOIN USUARIO u3 ON u3.ID_USUARIO = rc3.ID_USUARIO
                    WHERE h.ID_CONTRATO_HORAS = p.ID_REFERENCIA
               )
               WHEN 'PROYECTO_COSTO_MANO_OBRA' THEN (
                   SELECT CONCAT('Mano de obra: ', COALESCE(CONCAT(u4.NOMBRES, ' ', u4.APELLIDOS), pr4.RAZON_SOCIAL, 'Persona'), ' - ', mo.PERIODO)
                     FROM PROYECTO_COSTO_MANO_OBRA mo
                     LEFT JOIN RRHH_CONTRATO rc4 ON rc4.ID_CONTRATO = mo.ID_CONTRATO
                     LEFT JOIN USUARIO u4 ON u4.ID_USUARIO = rc4.ID_USUARIO
                     LEFT JOIN PROVEEDOR pr4 ON pr4.ID_PROVEEDOR = mo.ID_PROVEEDOR
                    WHERE mo.ID_ASIGNACION = p.ID_REFERENCIA
               )
               WHEN 'PAGO_RECURRENTE_INSTANCIA' THEN (
                   SELECT CONCAT('Pago recurrente: ', pr5.NOMBRE, ' - ', pri.PERIODO)
                     FROM PAGO_RECURRENTE_INSTANCIA pri
                     JOIN PAGO_RECURRENTE pr5 ON pr5.ID_PAGO_RECURRENTE = pri.ID_PAGO_RECURRENTE
                    WHERE pri.ID_INSTANCIA = p.ID_REFERENCIA
               )
               ELSE NULL
           END AS FINANCIA_DESCRIPCION,
           p.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE
      FROM PASIVO p
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PASIVO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = p.ID_MONEDA
      LEFT JOIN CUENTA_EMPRESA cu ON cu.ID_CUENTA = p.ID_CUENTA_PAGO
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = p.ID_PROVEEDOR
      LEFT JOIN DIRECTORIO_CONTACTO_EXTERNO dc ON dc.ID_CONTACTO = p.ID_CONTACTO
      LEFT JOIN USUARIO u ON u.ID_USUARIO = p.ID_USUARIO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = p.ID_PROYECTO
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PASIVO
     WHERE p.ID_PASIVO = p_id_pasivo;
END$$

-- Tipo, moneda y monto total no se editan una vez creado (igual criterio
-- que SP_CUENTA_ACTUALIZAR) -- solo datos administrativos, el acreedor y
-- la cuenta de pago por defecto. El acreedor sigue el mismo guard de
-- "exactamente una de tres fuentes" que SP_PASIVO_CREAR -- si no se
-- cumple, no-op completo (no se actualiza nada, para no dejar un
-- acreedor invalido a medias).
CREATE PROCEDURE SP_PASIVO_ACTUALIZAR(
    IN p_id_pasivo INT UNSIGNED,
    IN p_id_proveedor INT UNSIGNED,
    IN p_id_contacto INT UNSIGNED,
    IN p_id_usuario INT UNSIGNED,
    IN p_descripcion VARCHAR(300),
    IN p_nro_operacion VARCHAR(60),
    IN p_tasa_interes DECIMAL(5,2),
    IN p_id_cuenta_pago INT UNSIGNED,
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    DECLARE v_cantidad_fuentes INT;
    SET v_cantidad_fuentes = (IF(p_id_proveedor IS NOT NULL, 1, 0) + IF(p_id_contacto IS NOT NULL, 1, 0) + IF(p_id_usuario IS NOT NULL, 1, 0));

    IF v_cantidad_fuentes = 1 THEN
        UPDATE PASIVO
           SET ID_PROVEEDOR = p_id_proveedor,
               ID_CONTACTO = p_id_contacto,
               ID_USUARIO = p_id_usuario,
               DESCRIPCION = p_descripcion,
               NRO_OPERACION = p_nro_operacion,
               TASA_INTERES = p_tasa_interes,
               ID_CUENTA_PAGO = p_id_cuenta_pago,
               USUARIO_MODIFICACION = p_id_usuario_modificacion
         WHERE ID_PASIVO = p_id_pasivo;
    END IF;
END$$

-- Solo se puede anular un pasivo si ninguna cuota fue pagada todavia
-- (no-op silencioso si no cumple, mismo patron que SP_CUENTA_MOVIMIENTO_ELIMINAR).
CREATE PROCEDURE SP_PASIVO_ANULAR(
    IN p_id_pasivo INT UNSIGNED,
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    DECLARE v_hay_pagadas INT;
    DECLARE v_id_anulado INT UNSIGNED;

    SELECT COUNT(*) INTO v_hay_pagadas
      FROM PASIVO_CUOTA pc
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
     WHERE pc.ID_PASIVO = p_id_pasivo AND ec.CODIGO = 'PAGADA';

    IF v_hay_pagadas = 0 THEN
        SET v_id_anulado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PASIVO' AND CODIGO = 'ANULADO' LIMIT 1);

        UPDATE PASIVO
           SET ID_ESTADO_PASIVO = v_id_anulado, USUARIO_MODIFICACION = p_id_usuario_modificacion
         WHERE ID_PASIVO = p_id_pasivo;
    END IF;
END$$

-- Cuotas se agregan una por una (sin generador de cronograma). Si no se
-- indica cuenta de pago, hereda la cuenta por defecto del pasivo.
CREATE PROCEDURE SP_PASIVO_CUOTA_AGREGAR(
    IN p_id_pasivo INT UNSIGNED,
    IN p_nro_cuota INT UNSIGNED,
    IN p_fecha_vencimiento DATE,
    IN p_monto DECIMAL(14,2),
    IN p_id_cuenta_pago INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_cuota INT UNSIGNED
)
BEGIN
    DECLARE v_id_pendiente INT UNSIGNED;
    DECLARE v_id_cuenta_pago INT UNSIGNED;
    SET v_id_pendiente = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA' AND CODIGO = 'PENDIENTE' LIMIT 1);
    SET v_id_cuenta_pago = COALESCE(p_id_cuenta_pago, (SELECT ID_CUENTA_PAGO FROM PASIVO WHERE ID_PASIVO = p_id_pasivo));

    INSERT INTO PASIVO_CUOTA (
        ID_PASIVO, NRO_CUOTA, FECHA_VENCIMIENTO, MONTO, ID_ESTADO_CUOTA, ID_CUENTA_PAGO, USUARIO_CREACION
    ) VALUES (
        p_id_pasivo, p_nro_cuota, p_fecha_vencimiento, p_monto, v_id_pendiente, v_id_cuenta_pago, p_id_usuario_creacion
    );

    SET p_id_cuota = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_PASIVO_CUOTA_LISTAR(
    IN p_id_pasivo INT UNSIGNED
)
BEGIN
    SELECT pc.ID_CUOTA, pc.ID_PASIVO, pc.NRO_CUOTA, pc.FECHA_VENCIMIENTO, pc.MONTO,
           pc.FECHA_PAGO, pc.ID_MOVIMIENTO, pc.MOTIVO_PROTESTO, pc.FECHA_PROTESTO,
           pc.ID_CUENTA_PAGO, cu.NOMBRE AS CUENTA_PAGO_NOMBRE,
           pc.ID_ESTADO_CUOTA, ec.CODIGO AS ESTADO_CUOTA_CODIGO, ec.DESCRIPCION AS ESTADO_CUOTA_DESCRIPCION
      FROM PASIVO_CUOTA pc
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
      LEFT JOIN CUENTA_EMPRESA cu ON cu.ID_CUENTA = pc.ID_CUENTA_PAGO
     WHERE pc.ID_PASIVO = p_id_pasivo
     ORDER BY pc.NRO_CUOTA;
END$$

-- Borrado real solo mientras la cuota sigue PENDIENTE (para corregir un
-- dato antes de que se le haya asociado dinero o un protesto). No-op
-- silencioso en cualquier otro estado.
CREATE PROCEDURE SP_PASIVO_CUOTA_ELIMINAR(
    IN p_id_cuota INT UNSIGNED
)
BEGIN
    DELETE pc FROM PASIVO_CUOTA pc
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
     WHERE pc.ID_CUOTA = p_id_cuota AND ec.CODIGO = 'PENDIENTE';
END$$

-- Se llama despues de SP_CUENTA_MOVIMIENTO_REGISTRAR (ver nota al inicio
-- del archivo). Acepta cuotas PENDIENTE o PROTESTADA -- una letra
-- protestada igual se puede terminar pagando. Guard idempotente: si ya
-- esta PAGADA, no-op (permite reintentar sin duplicar el efecto). Si ya
-- no quedan cuotas PENDIENTE/PROTESTADA del pasivo, lo pasa a CANCELADO.
CREATE PROCEDURE SP_PASIVO_CUOTA_MARCAR_PAGADA(
    IN p_id_cuota INT UNSIGNED,
    IN p_id_movimiento INT UNSIGNED,
    IN p_id_cuenta_pago INT UNSIGNED,
    IN p_fecha_pago DATE
)
BEGIN
    DECLARE v_id_pasivo INT UNSIGNED;
    DECLARE v_id_pagada INT UNSIGNED;
    DECLARE v_id_cancelado INT UNSIGNED;
    DECLARE v_quedan_pendientes INT;

    SET v_id_pagada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA' AND CODIGO = 'PAGADA' LIMIT 1);

    SELECT pc.ID_PASIVO INTO v_id_pasivo
      FROM PASIVO_CUOTA pc
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
     WHERE pc.ID_CUOTA = p_id_cuota AND ec.CODIGO IN ('PENDIENTE', 'PROTESTADA');

    IF v_id_pasivo IS NOT NULL THEN
        UPDATE PASIVO_CUOTA
           SET ID_ESTADO_CUOTA = v_id_pagada,
               ID_CUENTA_PAGO = p_id_cuenta_pago,
               ID_MOVIMIENTO = p_id_movimiento,
               FECHA_PAGO = p_fecha_pago
         WHERE ID_CUOTA = p_id_cuota;

        SELECT COUNT(*) INTO v_quedan_pendientes
          FROM PASIVO_CUOTA pc
          JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
         WHERE pc.ID_PASIVO = v_id_pasivo AND ec.CODIGO IN ('PENDIENTE', 'PROTESTADA');

        IF v_quedan_pendientes = 0 THEN
            SET v_id_cancelado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PASIVO' AND CODIGO = 'CANCELADO' LIMIT 1);
            UPDATE PASIVO SET ID_ESTADO_PASIVO = v_id_cancelado WHERE ID_PASIVO = v_id_pasivo;
        END IF;
    END IF;
END$$

-- No genera movimiento (la cuota no se pago, se registra el hecho legal).
-- Solo se puede protestar una cuota que sigue PENDIENTE.
CREATE PROCEDURE SP_PASIVO_CUOTA_PROTESTAR(
    IN p_id_cuota INT UNSIGNED,
    IN p_motivo VARCHAR(300),
    IN p_fecha_protesto DATE
)
BEGIN
    DECLARE v_id_protestada INT UNSIGNED;
    SET v_id_protestada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA' AND CODIGO = 'PROTESTADA' LIMIT 1);

    UPDATE PASIVO_CUOTA pc
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
       SET pc.ID_ESTADO_CUOTA = v_id_protestada,
           pc.MOTIVO_PROTESTO = p_motivo,
           pc.FECHA_PROTESTO = p_fecha_protesto
     WHERE pc.ID_CUOTA = p_id_cuota AND ec.CODIGO = 'PENDIENTE';
END$$

-- Para condonaciones/castigos que no pasan por caja -- distinto de
-- PROTESTAR (que solo registra el impago, sin cerrar la obligacion).
-- Tambien revisa si el pasivo queda sin cuotas pendientes para cerrarlo.
CREATE PROCEDURE SP_PASIVO_CUOTA_ANULAR(
    IN p_id_cuota INT UNSIGNED
)
BEGIN
    DECLARE v_id_pasivo INT UNSIGNED;
    DECLARE v_id_anulada INT UNSIGNED;
    DECLARE v_id_cancelado INT UNSIGNED;
    DECLARE v_quedan_pendientes INT;

    SET v_id_anulada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA' AND CODIGO = 'ANULADA' LIMIT 1);

    SELECT pc.ID_PASIVO INTO v_id_pasivo
      FROM PASIVO_CUOTA pc
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
     WHERE pc.ID_CUOTA = p_id_cuota AND ec.CODIGO IN ('PENDIENTE', 'PROTESTADA');

    IF v_id_pasivo IS NOT NULL THEN
        UPDATE PASIVO_CUOTA SET ID_ESTADO_CUOTA = v_id_anulada WHERE ID_CUOTA = p_id_cuota;

        SELECT COUNT(*) INTO v_quedan_pendientes
          FROM PASIVO_CUOTA pc
          JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
         WHERE pc.ID_PASIVO = v_id_pasivo AND ec.CODIGO IN ('PENDIENTE', 'PROTESTADA');

        IF v_quedan_pendientes = 0 THEN
            SET v_id_cancelado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PASIVO' AND CODIGO = 'CANCELADO' LIMIT 1);
            UPDATE PASIVO SET ID_ESTADO_PASIVO = v_id_cancelado WHERE ID_PASIVO = v_id_pasivo;
        END IF;
    END IF;
END$$

-- Alimenta el plan de pagos: todas las cuotas todavia pendientes de
-- todos los pasivos (incluye PROTESTADA -- sigue siendo dinero que se
-- debe), con los datos de la cuenta que las pagaria para poder proyectar
-- el saldo en la app.
CREATE PROCEDURE SP_PASIVO_CUOTA_LISTAR_PENDIENTES()
BEGIN
    SELECT pc.ID_CUOTA, pc.ID_PASIVO, pc.NRO_CUOTA, pc.FECHA_VENCIMIENTO, pc.MONTO,
           COALESCE(pr.RAZON_SOCIAL, CONCAT(dc.NOMBRES, ' ', dc.APELLIDOS), CONCAT(u.NOMBRES, ' ', u.APELLIDOS)) AS ACREEDOR,
           tp.DESCRIPCION AS TIPO_PASIVO_DESCRIPCION,
           pc.ID_ESTADO_CUOTA, ec.CODIGO AS ESTADO_CUOTA_CODIGO, ec.DESCRIPCION AS ESTADO_CUOTA_DESCRIPCION,
           pc.ID_CUENTA_PAGO, cu.NOMBRE AS CUENTA_PAGO_NOMBRE, cu.SALDO_ACTUAL AS CUENTA_SALDO_ACTUAL,
           mo.CODIGO AS CUENTA_MONEDA_CODIGO
      FROM PASIVO_CUOTA pc
      JOIN PASIVO p ON p.ID_PASIVO = pc.ID_PASIVO
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PASIVO
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = pc.ID_ESTADO_CUOTA
      LEFT JOIN CUENTA_EMPRESA cu ON cu.ID_CUENTA = pc.ID_CUENTA_PAGO
      LEFT JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = cu.ID_MONEDA
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = p.ID_PROVEEDOR
      LEFT JOIN DIRECTORIO_CONTACTO_EXTERNO dc ON dc.ID_CONTACTO = p.ID_CONTACTO
      LEFT JOIN USUARIO u ON u.ID_USUARIO = p.ID_USUARIO
     WHERE ec.CODIGO IN ('PENDIENTE', 'PROTESTADA')
     ORDER BY pc.FECHA_VENCIMIENTO;
END$$

DELIMITER ;
