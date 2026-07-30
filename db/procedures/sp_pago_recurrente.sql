-- =====================================================================
-- Cronograma de pagos recurrentes: CRUD de PAGO_RECURRENTE (la
-- configuracion) y de PAGO_RECURRENTE_INSTANCIA (las ocurrencias
-- generadas). Mismo patron que RRHH_CONTRATO/RRHH_CONTRATO_PERIODO_PAGO
-- -- "cuales instancias generar" (un periodo por cada INTERVALO_MESES
-- entre FECHA_INICIO y hoy/FECHA_FIN, saltando las que ya existen) se
-- calcula en la app (src/lib/pagos-recurrentes/generar-instancias.ts,
-- mismo estilo que src/lib/rrhh/periodos-pago.ts), que llama a
-- INSTANCIA_AGREGAR una vez por periodo faltante.
--
-- Una instancia se paga con una cuenta de la empresa (FECHA_PAGO/
-- ID_MOVIMIENTO, flujo de dos pasos: primero SP_CUENTA_MOVIMIENTO_REGISTRAR
-- desde la app, despues INSTANCIA_MARCAR_PAGADA con el ID_MOVIMIENTO
-- resultante) o se financia con un pasivo nuevo
-- (PASIVO.TIPO_REFERENCIA='PAGO_RECURRENTE_INSTANCIA') -- nunca las dos
-- formas a la vez, pero eso no se guarda aqui, se calcula al vuelo
-- (FINANCIADO_CON_PASIVO).
--
-- GENERACION_DIA_OBTENER/GUARDAR son la cache de "ya se generaron las
-- instancias pendientes de hoy" (036_pago_recurrente_generacion_dia.sql,
-- mismo patron que TIPO_CAMBIO_SUNAT_DIA) -- ver
-- asegurarInstanciasGeneradasDelDia() en
-- src/lib/pagos-recurrentes/auto-generar.ts, llamado desde
-- facturacion/layout.tsx en cada request a Facturacion para que la
-- generacion sea automatica sin depender de que alguien visite
-- /facturacion/pagos-recurrentes y presione el boton.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_CREAR;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_LISTAR;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_OBTENER;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_CAMBIAR_ESTADO;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_INSTANCIA_AGREGAR;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_INSTANCIA_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_INSTANCIA_LISTAR;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_INSTANCIA_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_INSTANCIA_MARCAR_PAGADA;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_INSTANCIA_LISTAR_PENDIENTES;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_GENERACION_DIA_OBTENER;
DROP PROCEDURE IF EXISTS SP_PAGO_RECURRENTE_GENERACION_DIA_GUARDAR;

DELIMITER $$

-- p_monto_fijo llega NULL si p_es_variable=1 (se carga a mano cada vez
-- que se agrega/genera una instancia). p_id_proyecto es opcional --
-- NULL para un gasto administrativo/general o transversal a varios
-- proyectos (sin mecanismo de reparto automatico, ver 035_pagos_recurrentes.sql).
-- p_id_cuenta_pago_default es solo la cuenta sugerida, cada instancia
-- puede pagarse con otra.
-- p_tipo_cambio: obligatorio SOLO si p_id_proyecto viene informado y su
-- moneda es distinta a p_id_moneda -- no-op silencioso si falta, mismo
-- estilo que SP_RRHH_CONTRATO_PROYECTO_AGREGAR/SP_PROYECTO_COSTO_MANO_OBRA_AGREGAR.
-- Sin proyecto no hace falta TC (no hay con que moneda comparar).
CREATE PROCEDURE SP_PAGO_RECURRENTE_CREAR(
    IN p_nombre VARCHAR(150),
    IN p_descripcion VARCHAR(300),
    IN p_es_variable TINYINT,
    IN p_monto_fijo DECIMAL(12,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_intervalo_meses TINYINT UNSIGNED,
    IN p_dia_vencimiento TINYINT UNSIGNED,
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_id_proyecto INT UNSIGNED,
    IN p_id_cuenta_pago_default INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_pago_recurrente INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_requiere_tc TINYINT;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_requiere_tc = 0;

    IF p_id_proyecto IS NOT NULL THEN
        SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
        IF p_id_moneda != v_id_moneda_proyecto THEN
            SET v_requiere_tc = 1;
        END IF;
    END IF;

    IF NOT (v_requiere_tc = 1 AND p_tipo_cambio IS NULL) THEN
        INSERT INTO PAGO_RECURRENTE (
            NOMBRE, DESCRIPCION, ES_VARIABLE, MONTO_FIJO, ID_MONEDA, TIPO_CAMBIO, INTERVALO_MESES, DIA_VENCIMIENTO,
            FECHA_INICIO, FECHA_FIN, ID_PROYECTO, ID_CUENTA_PAGO_DEFAULT, ID_ESTADO, USUARIO_CREACION
        ) VALUES (
            p_nombre, p_descripcion, p_es_variable, IF(p_es_variable = 1, NULL, p_monto_fijo), p_id_moneda,
            IF(v_requiere_tc = 1, p_tipo_cambio, NULL), p_intervalo_meses, p_dia_vencimiento,
            p_fecha_inicio, p_fecha_fin, p_id_proyecto, p_id_cuenta_pago_default, v_id_activo, p_id_usuario_creacion
        );

        SET p_id_pago_recurrente = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_PAGO_RECURRENTE_LISTAR(
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT pr.ID_PAGO_RECURRENTE, pr.NOMBRE, pr.DESCRIPCION, pr.ES_VARIABLE, pr.MONTO_FIJO,
           pr.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, pr.TIPO_CAMBIO, pr.INTERVALO_MESES, pr.DIA_VENCIMIENTO,
           pr.FECHA_INICIO, pr.FECHA_FIN,
           pr.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE,
           pr.ID_CUENTA_PAGO_DEFAULT, cu.NOMBRE AS CUENTA_PAGO_DEFAULT_NOMBRE,
           pr.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM PAGO_RECURRENTE pr
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = pr.ID_MONEDA
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pr.ID_ESTADO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = pr.ID_PROYECTO
      LEFT JOIN CUENTA_EMPRESA cu ON cu.ID_CUENTA = pr.ID_CUENTA_PAGO_DEFAULT
     WHERE (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY e.CODIGO = 'ACTIVO' DESC, pr.NOMBRE;
END$$

CREATE PROCEDURE SP_PAGO_RECURRENTE_OBTENER(
    IN p_id_pago_recurrente INT UNSIGNED
)
BEGIN
    SELECT pr.ID_PAGO_RECURRENTE, pr.NOMBRE, pr.DESCRIPCION, pr.ES_VARIABLE, pr.MONTO_FIJO,
           pr.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO, pr.TIPO_CAMBIO, pr.INTERVALO_MESES, pr.DIA_VENCIMIENTO,
           pr.FECHA_INICIO, pr.FECHA_FIN,
           pr.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE,
           pr.ID_CUENTA_PAGO_DEFAULT, cu.NOMBRE AS CUENTA_PAGO_DEFAULT_NOMBRE,
           pr.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM PAGO_RECURRENTE pr
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = pr.ID_MONEDA
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pr.ID_ESTADO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = pr.ID_PROYECTO
      LEFT JOIN CUENTA_EMPRESA cu ON cu.ID_CUENTA = pr.ID_CUENTA_PAGO_DEFAULT
     WHERE pr.ID_PAGO_RECURRENTE = p_id_pago_recurrente;
END$$

-- Moneda, proyecto y fecha de inicio no se editan una vez creado (mismo
-- criterio que SP_CUENTA_ACTUALIZAR/SP_PROYECTO_ACTUALIZAR -- cambiarlos
-- a mitad de un cronograma ya generado no tendria sentido). El resto
-- (nombre, descripcion, fijo/variable + monto, intervalo, dia de
-- vencimiento, fecha fin, cuenta por defecto) si es editable.
CREATE PROCEDURE SP_PAGO_RECURRENTE_ACTUALIZAR(
    IN p_id_pago_recurrente INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_descripcion VARCHAR(300),
    IN p_es_variable TINYINT,
    IN p_monto_fijo DECIMAL(12,2),
    IN p_intervalo_meses TINYINT UNSIGNED,
    IN p_dia_vencimiento TINYINT UNSIGNED,
    IN p_fecha_fin DATE,
    IN p_id_cuenta_pago_default INT UNSIGNED,
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE PAGO_RECURRENTE
       SET NOMBRE = p_nombre,
           DESCRIPCION = p_descripcion,
           ES_VARIABLE = p_es_variable,
           MONTO_FIJO = IF(p_es_variable = 1, NULL, p_monto_fijo),
           INTERVALO_MESES = p_intervalo_meses,
           DIA_VENCIMIENTO = p_dia_vencimiento,
           FECHA_FIN = p_fecha_fin,
           ID_CUENTA_PAGO_DEFAULT = p_id_cuenta_pago_default,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_PAGO_RECURRENTE = p_id_pago_recurrente;
END$$

-- Pausar/reactivar sin borrar el historial de instancias ya generadas --
-- "Generar instancias pendientes" no-opea sobre un pago recurrente
-- INACTIVO (ver la app, el boton no se muestra).
CREATE PROCEDURE SP_PAGO_RECURRENTE_CAMBIAR_ESTADO(
    IN p_id_pago_recurrente INT UNSIGNED,
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

    UPDATE PAGO_RECURRENTE
       SET ID_ESTADO = v_id_estado, USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_PAGO_RECURRENTE = p_id_pago_recurrente;
END$$

-- Si p_id_cuenta_pago llega NULL, hereda ID_CUENTA_PAGO_DEFAULT del
-- padre -- mismo patron que SP_PASIVO_CUOTA_AGREGAR con PASIVO.ID_CUENTA_PAGO.
-- p_monto siempre llega calculado desde la app (MONTO_FIJO copiado, o
-- cargado a mano si es variable) -- una sola fuente de verdad para el
-- calculo de "cuales instancias generar" (ver generar-instancias.ts).
CREATE PROCEDURE SP_PAGO_RECURRENTE_INSTANCIA_AGREGAR(
    IN p_id_pago_recurrente INT UNSIGNED,
    IN p_periodo VARCHAR(100),
    IN p_fecha_vencimiento DATE,
    IN p_monto DECIMAL(12,2),
    IN p_id_cuenta_pago INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_instancia INT UNSIGNED
)
BEGIN
    DECLARE v_id_cuenta_pago INT UNSIGNED;
    SET v_id_cuenta_pago = COALESCE(p_id_cuenta_pago, (SELECT ID_CUENTA_PAGO_DEFAULT FROM PAGO_RECURRENTE WHERE ID_PAGO_RECURRENTE = p_id_pago_recurrente));

    INSERT INTO PAGO_RECURRENTE_INSTANCIA (
        ID_PAGO_RECURRENTE, PERIODO, FECHA_VENCIMIENTO, MONTO, ID_CUENTA_PAGO, USUARIO_CREACION
    ) VALUES (
        p_id_pago_recurrente, p_periodo, p_fecha_vencimiento, p_monto, v_id_cuenta_pago, p_id_usuario_creacion
    );

    SET p_id_instancia = LAST_INSERT_ID();
END$$

-- Editar el monto (y/o cuenta de pago) de una instancia ya generada
-- mientras siga sin pagar y sin financiar -- no-op silencioso en
-- cualquier otro caso, mismo estilo que SP_RRHH_CONTRATO_PERIODO_PAGO_ACTUALIZAR.
-- Es el mecanismo para cargar el monto real de un pago recurrente
-- ES_VARIABLE=1 (que se genera con MONTO=0 como placeholder, ver
-- generar-instancias.ts / generarInstanciasPendientesAction) y tambien
-- sirve para corregir un monto fijo puntual (ej. un mes con recargo).
CREATE PROCEDURE SP_PAGO_RECURRENTE_INSTANCIA_ACTUALIZAR(
    IN p_id_instancia INT UNSIGNED,
    IN p_monto DECIMAL(12,2),
    IN p_id_cuenta_pago INT UNSIGNED
)
BEGIN
    UPDATE PAGO_RECURRENTE_INSTANCIA i
       SET i.MONTO = p_monto, i.ID_CUENTA_PAGO = p_id_cuenta_pago
     WHERE i.ID_INSTANCIA = p_id_instancia
       AND i.ID_MOVIMIENTO IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM PASIVO ps
             JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
            WHERE ps.TIPO_REFERENCIA = 'PAGO_RECURRENTE_INSTANCIA' AND ps.ID_REFERENCIA = i.ID_INSTANCIA
              AND ep.CODIGO != 'ANULADO'
       );
END$$

-- FINANCIADO_CON_PASIVO: si un pasivo (no anulado) referencia esta
-- instancia, ya esta resuelta aunque ID_MOVIMIENTO siga NULL.
CREATE PROCEDURE SP_PAGO_RECURRENTE_INSTANCIA_LISTAR(
    IN p_id_pago_recurrente INT UNSIGNED
)
BEGIN
    SELECT i.ID_INSTANCIA, i.ID_PAGO_RECURRENTE, i.PERIODO, i.FECHA_VENCIMIENTO, i.MONTO,
           i.ID_CUENTA_PAGO, cu.NOMBRE AS CUENTA_PAGO_NOMBRE,
           i.FECHA_PAGO, i.ID_MOVIMIENTO, i.FECHA_CREACION,
           EXISTS (
               SELECT 1 FROM PASIVO ps
                 JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
                WHERE ps.TIPO_REFERENCIA = 'PAGO_RECURRENTE_INSTANCIA' AND ps.ID_REFERENCIA = i.ID_INSTANCIA
                  AND ep.CODIGO != 'ANULADO'
           ) AS FINANCIADO_CON_PASIVO
      FROM PAGO_RECURRENTE_INSTANCIA i
      LEFT JOIN CUENTA_EMPRESA cu ON cu.ID_CUENTA = i.ID_CUENTA_PAGO
     WHERE i.ID_PAGO_RECURRENTE = p_id_pago_recurrente
     ORDER BY i.FECHA_VENCIMIENTO DESC;
END$$

-- Borrado real solo mientras siga sin pagar ni financiar (corregir una
-- instancia generada por error), mismo criterio que SP_PASIVO_CUOTA_ELIMINAR.
CREATE PROCEDURE SP_PAGO_RECURRENTE_INSTANCIA_ELIMINAR(
    IN p_id_instancia INT UNSIGNED
)
BEGIN
    DELETE i FROM PAGO_RECURRENTE_INSTANCIA i
     WHERE i.ID_INSTANCIA = p_id_instancia
       AND i.ID_MOVIMIENTO IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM PASIVO ps
             JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
            WHERE ps.TIPO_REFERENCIA = 'PAGO_RECURRENTE_INSTANCIA' AND ps.ID_REFERENCIA = i.ID_INSTANCIA
              AND ep.CODIGO != 'ANULADO'
       );
END$$

-- No-op silencioso si la instancia ya estaba pagada, mismo patron que
-- SP_RRHH_CONTRATO_HORAS_MARCAR_PAGADA/SP_RRHH_CONTRATO_PERIODO_PAGO_MARCAR_PAGADA.
CREATE PROCEDURE SP_PAGO_RECURRENTE_INSTANCIA_MARCAR_PAGADA(
    IN p_id_instancia INT UNSIGNED,
    IN p_id_movimiento INT UNSIGNED,
    IN p_fecha_pago DATE
)
BEGIN
    UPDATE PAGO_RECURRENTE_INSTANCIA
       SET FECHA_PAGO = p_fecha_pago, ID_MOVIMIENTO = p_id_movimiento
     WHERE ID_INSTANCIA = p_id_instancia AND ID_MOVIMIENTO IS NULL;
END$$

-- Cross-pago-recurrente, para Cuentas por Pagar y las alertas de
-- vencimiento -- excluye instancias ya pagadas o financiadas con un
-- pasivo. Solo trae pagos recurrentes ACTIVOS (uno INACTIVO no genera
-- mas alertas, pero sus instancias ya generadas y pendientes -- si
-- alguna quedo suelta -- tampoco deberian seguir apareciendo, se asume
-- que desactivar significa "ya no aplica").
CREATE PROCEDURE SP_PAGO_RECURRENTE_INSTANCIA_LISTAR_PENDIENTES()
BEGIN
    SELECT i.ID_INSTANCIA, i.ID_PAGO_RECURRENTE, pr.NOMBRE AS PAGO_RECURRENTE_NOMBRE,
           pr.ID_PROYECTO, py.NOMBRE AS PROYECTO_NOMBRE,
           i.PERIODO, i.FECHA_VENCIMIENTO, i.MONTO, pr.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO
      FROM PAGO_RECURRENTE_INSTANCIA i
      JOIN PAGO_RECURRENTE pr ON pr.ID_PAGO_RECURRENTE = i.ID_PAGO_RECURRENTE
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = pr.ID_MONEDA
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pr.ID_ESTADO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = pr.ID_PROYECTO
     WHERE i.ID_MOVIMIENTO IS NULL
       AND e.CODIGO = 'ACTIVO'
       AND NOT EXISTS (
           SELECT 1 FROM PASIVO ps
             JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = ps.ID_ESTADO_PASIVO
            WHERE ps.TIPO_REFERENCIA = 'PAGO_RECURRENTE_INSTANCIA' AND ps.ID_REFERENCIA = i.ID_INSTANCIA
              AND ep.CODIGO != 'ANULADO'
       )
     ORDER BY i.FECHA_VENCIMIENTO;
END$$

-- Vacio (0 filas) si todavia no se genero automaticamente hoy -- la app
-- lo usa para decidir si hace falta recorrer todos los pagos recurrentes
-- activos. Mismo patron que SP_TIPO_CAMBIO_SUNAT_OBTENER_DIA.
CREATE PROCEDURE SP_PAGO_RECURRENTE_GENERACION_DIA_OBTENER(
    IN p_fecha DATE
)
BEGIN
    SELECT FECHA FROM PAGO_RECURRENTE_GENERACION_DIA WHERE FECHA = p_fecha;
END$$

-- No-op silencioso si esa fecha ya se guardo antes -- evita duplicados
-- si dos requests dispararan la generacion casi al mismo tiempo (FECHA
-- es PK, pero se valida con NOT EXISTS en vez de dejar que falle el
-- INSERT, mismo estilo del resto del sistema). Mismo patron que
-- SP_TIPO_CAMBIO_SUNAT_GUARDAR_DIA.
CREATE PROCEDURE SP_PAGO_RECURRENTE_GENERACION_DIA_GUARDAR(
    IN p_fecha DATE
)
BEGIN
    INSERT INTO PAGO_RECURRENTE_GENERACION_DIA (FECHA)
    SELECT p_fecha
     WHERE NOT EXISTS (SELECT 1 FROM PAGO_RECURRENTE_GENERACION_DIA WHERE FECHA = p_fecha);
END$$

DELIMITER ;
