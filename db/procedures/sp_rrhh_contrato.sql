-- =====================================================================
-- Procedimientos de RRHH_CONTRATO: alta, listado, link de firma publico,
-- firma, y renovacion.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_CREAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_OBTENER;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_GENERAR_LINK;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_OBTENER_POR_TOKEN;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_FIRMAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_RENOVAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_ACTUALIZAR_FUNCIONES;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_ELIMINAR;
-- SP_RRHH_CONTRATO_LISTAR_PARA_PAGOS ya no existe -- la reemplazo el
-- flujo de periodos de pago (ver sp_rrhh_contrato_periodo_pago.sql), que
-- calcula el monto sugerido de un periodo nuevo en la app (mismos datos
-- que ya trae la pantalla del contrato) en vez de un round-trip aparte.
-- Se deja el DROP para limpiar el procedimiento viejo en bases que ya lo
-- tenian.
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_LISTAR_PARA_PAGOS;

DELIMITER $$

-- p_tarifa/p_nombre_proyecto/p_periodo_pago solo aplican a LOCADOR
-- MENSUAL/POR_JORNADA (un solo monto). Para PLANILLA los montos se
-- agregan despues como lineas de concepto (SP_RRHH_CONTRATO_CONCEPTO_AGREGAR);
-- para LOCADOR POR_HORA, como proyectos con su propia tarifa
-- (SP_RRHH_CONTRATO_PROYECTO_AGREGAR).
-- p_dias_laborales/p_hora_inicio/p_hora_fin/p_nota_jornada solo aplican a
-- PLANILLA (un locador no tiene jornada por ley -- no hay subordinacion).
-- p_funciones tambien es solo de PLANILLA por el mismo motivo (funciones
-- de puesto = subordinacion) -- se fuerza a NULL si viene con locador,
-- sin importar lo que llegue del formulario (mismo criterio que
-- ES_INTERNO forzando ID_CLIENTE=NULL en Proyectos).
-- p_id_proyecto reemplaza el texto libre de antes -- es obligatorio
-- SOLO para POR_PROYECTO (pago fijo por un entregable, 1:1 con un
-- Proyecto/Servicio real, se suma automatico a su costeo). MENSUAL/
-- POR_JORNADA lo dejan opcional -- un locador de honorario recurrente
-- puede ser transversal a varios proyectos a la vez (ej. gerencia,
-- soporte general), no siempre tiene un unico proyecto "dueño"; ese
-- costo se sigue asignando proyecto por proyecto a mano desde "Mano de
-- obra (asignacion manual)" (que sí admite enlazar el mismo contrato a
-- varios proyectos, uno por fila). No-op silencioso si falta cuando se
-- exige (p_id_contrato queda NULL), mismo estilo que el resto del
-- sistema.
-- NRO_CUENTA/CCI/BANCO no vienen como parametro -- se copian solos del
-- contrato mas reciente de esa persona que ya los tenga (cualquier tipo/
-- estado), igual que ya hacia SP_RRHH_CONTRATO_RENOVAR para renovaciones,
-- pero aca tambien cubre a alguien que pasa a un contrato de tipo
-- distinto (ej. planilla a locador) sin ser una renovacion tecnica. Sigue
-- quedando editable en la pantalla publica de firma (FirmarContratoForm),
-- esto solo evita reescribir datos que no cambiaron.
-- p_id_moneda/p_tipo_cambio solo aplican junto con p_tarifa (tarifa
-- unica) -- igual que p_tarifa, la app no los manda para PLANILLA/
-- POR_HORA, asi que llegan NULL solos, sin forzarlo aca (034_rrhh_contrato_moneda.sql).
-- p_tipo_cambio: obligatorio SOLO si p_id_proyecto viene informado y su
-- moneda es distinta a p_id_moneda -- no-op silencioso si falta, mismo
-- estilo que SP_PROYECTO_COSTO_MANO_OBRA_AGREGAR.
CREATE PROCEDURE SP_RRHH_CONTRATO_CREAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_id_tipo_contrato INT UNSIGNED,
    IN p_id_tipo_pago_locador INT UNSIGNED,
    IN p_cargo VARCHAR(100),
    IN p_funciones TEXT,
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_dias_laborales VARCHAR(100),
    IN p_hora_inicio TIME,
    IN p_hora_fin TIME,
    IN p_nota_jornada VARCHAR(300),
    IN p_tarifa DECIMAL(10,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_id_proyecto INT UNSIGNED,
    IN p_periodo_pago VARCHAR(100),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_contrato INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_borrador INT UNSIGNED;
    DECLARE v_tipo_pago_codigo VARCHAR(30);
    DECLARE v_requiere_proyecto TINYINT;
    DECLARE v_nro_cuenta VARCHAR(30);
    DECLARE v_cci VARCHAR(30);
    DECLARE v_banco VARCHAR(60);
    DECLARE v_id_moneda_proyecto INT UNSIGNED;
    DECLARE v_requiere_tc TINYINT;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_borrador = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONTRATO' AND CODIGO = 'BORRADOR' LIMIT 1);
    SET v_requiere_proyecto = 0;
    SET v_requiere_tc = 0;

    -- Si la persona ya tiene un contrato anterior (cualquier tipo/estado)
    -- con datos bancarios capturados, se copian al nuevo -- igual que
    -- SP_RRHH_CONTRATO_RENOVAR ya hace para una renovacion, pero aca
    -- aplica tambien quien pasa a un contrato distinto (ej. planilla a
    -- locador) sin ser tecnicamente una "renovacion". Quedan editables
    -- igual en la pantalla de firma, esto solo evita que la persona
    -- tenga que volver a escribirlos si no cambiaron.
    SELECT NRO_CUENTA, CCI, BANCO INTO v_nro_cuenta, v_cci, v_banco
      FROM RRHH_CONTRATO
     WHERE ID_USUARIO = p_id_usuario AND NRO_CUENTA IS NOT NULL
     ORDER BY FECHA_CREACION DESC
     LIMIT 1;

    IF p_id_tipo_pago_locador IS NOT NULL THEN
        SELECT CODIGO INTO v_tipo_pago_codigo FROM MAESTRO_MAESTRO WHERE ID_MAESTRO = p_id_tipo_pago_locador;
        IF v_tipo_pago_codigo = 'POR_PROYECTO' THEN
            SET v_requiere_proyecto = 1;
        END IF;
    END IF;

    IF p_id_proyecto IS NOT NULL THEN
        SELECT ID_MONEDA INTO v_id_moneda_proyecto FROM PROYECTO WHERE ID_PROYECTO = p_id_proyecto;
        IF p_id_moneda IS NOT NULL AND p_id_moneda != v_id_moneda_proyecto THEN
            SET v_requiere_tc = 1;
        END IF;
    END IF;

    -- v_requiere_proyecto siempre es 0/1 (nunca NULL) a proposito: si
    -- p_id_tipo_pago_locador es NULL (PLANILLA), v_tipo_pago_codigo
    -- tambien queda NULL, y "NULL IN (...)" evalua NULL -- un IF con esa
    -- condicion se trata como falso y saltaba el INSERT para CUALQUIER
    -- contrato de planilla sin proyecto, no solo los que de verdad
    -- necesitaban uno. Con v_requiere_proyecto/v_requiere_tc ya resueltos
    -- a 0/1 antes, la condicion de abajo nunca cae en NULL.
    IF NOT (v_requiere_proyecto = 1 AND p_id_proyecto IS NULL)
       AND NOT (v_requiere_tc = 1 AND p_tipo_cambio IS NULL) THEN
        INSERT INTO RRHH_CONTRATO (
            ID_USUARIO, ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, CARGO, FUNCIONES,
            FECHA_INICIO, FECHA_FIN, DIAS_LABORALES, HORA_INICIO, HORA_FIN, NOTA_JORNADA,
            TARIFA, ID_MONEDA, TIPO_CAMBIO, ID_PROYECTO, PERIODO_PAGO, NRO_CUENTA, CCI, BANCO,
            ID_ESTADO_CONTRATO, ID_ESTADO, USUARIO_CREACION
        ) VALUES (
            p_id_usuario, p_id_tipo_contrato, p_id_tipo_pago_locador, p_cargo,
            IF(p_id_tipo_pago_locador IS NULL, p_funciones, NULL),
            p_fecha_inicio, p_fecha_fin, p_dias_laborales, p_hora_inicio, p_hora_fin, p_nota_jornada,
            p_tarifa, p_id_moneda, IF(v_requiere_tc = 1, p_tipo_cambio, NULL), p_id_proyecto, p_periodo_pago,
            v_nro_cuenta, v_cci, v_banco,
            v_id_borrador, v_id_activo, p_id_usuario_creacion
        );

        SET p_id_contrato = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_LISTAR(
    IN p_id_estado_contrato INT UNSIGNED,
    IN p_solo_por_vencer_dias INT
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    SELECT c.ID_CONTRATO, c.ID_USUARIO, u.NOMBRES, u.APELLIDOS,
           tc.CODIGO AS TIPO_CONTRATO_CODIGO, tc.DESCRIPCION AS TIPO_CONTRATO_DESCRIPCION,
           c.CARGO, c.FECHA_INICIO, c.FECHA_FIN,
           ec.CODIGO AS ESTADO_CONTRATO_CODIGO, ec.DESCRIPCION AS ESTADO_CONTRATO_DESCRIPCION
      FROM RRHH_CONTRATO c
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CONTRATO
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
     WHERE c.ID_ESTADO = v_id_activo
       AND (p_id_estado_contrato IS NULL OR c.ID_ESTADO_CONTRATO = p_id_estado_contrato)
       AND (
            p_solo_por_vencer_dias IS NULL OR (
                ec.CODIGO = 'FIRMADO'
                AND c.FECHA_FIN IS NOT NULL
                AND c.FECHA_FIN BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL p_solo_por_vencer_dias DAY)
            )
       )
     ORDER BY c.FECHA_FIN IS NULL, c.FECHA_FIN, u.APELLIDOS;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_OBTENER(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    SELECT c.*, u.NOMBRES, u.APELLIDOS, u.CORREO,
           e.NRO_DOCUMENTO, e.DIRECCION,
           td.CODIGO AS TIPO_DOCUMENTO_CODIGO, td.DESCRIPCION AS TIPO_DOCUMENTO_DESCRIPCION,
           pa.DESCRIPCION AS PAIS_DESCRIPCION, ci.DESCRIPCION AS CIUDAD_DESCRIPCION,
           tc.CODIGO AS TIPO_CONTRATO_CODIGO, tc.DESCRIPCION AS TIPO_CONTRATO_DESCRIPCION,
           tp.CODIGO AS TIPO_PAGO_LOCADOR_CODIGO, tp.DESCRIPCION AS TIPO_PAGO_LOCADOR_DESCRIPCION,
           ec.CODIGO AS ESTADO_CONTRATO_CODIGO, ec.DESCRIPCION AS ESTADO_CONTRATO_DESCRIPCION,
           py.NOMBRE AS NOMBRE_PROYECTO, mo.CODIGO AS MONEDA_CODIGO
      FROM RRHH_CONTRATO c
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      LEFT JOIN RRHH_EMPLEADO e ON e.ID_USUARIO = c.ID_USUARIO
      LEFT JOIN MAESTRO_MAESTRO td ON td.ID_MAESTRO = e.ID_TIPO_DOCUMENTO
      LEFT JOIN MAESTRO_MAESTRO pa ON pa.ID_MAESTRO = e.ID_PAIS
      LEFT JOIN MAESTRO_MAESTRO ci ON ci.ID_MAESTRO = e.ID_CIUDAD
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CONTRATO
      LEFT JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = c.ID_TIPO_PAGO_LOCADOR
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = c.ID_PROYECTO
      LEFT JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = c.ID_MONEDA
     WHERE c.ID_CONTRATO = p_id_contrato;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_GENERAR_LINK(
    IN p_id_contrato INT UNSIGNED,
    IN p_token CHAR(36),
    IN p_token_expira DATETIME
)
BEGIN
    DECLARE v_id_pendiente INT UNSIGNED;
    SET v_id_pendiente = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONTRATO' AND CODIGO = 'PENDIENTE_FIRMA' LIMIT 1);

    UPDATE RRHH_CONTRATO
       SET TOKEN_FIRMA = p_token, TOKEN_EXPIRA = p_token_expira, ID_ESTADO_CONTRATO = v_id_pendiente
     WHERE ID_CONTRATO = p_id_contrato;
END$$

-- Usado por la pagina publica /contratos/firmar/[token]. La vigencia del
-- token (TOKEN_EXPIRA > NOW(), estado = PENDIENTE_FIRMA) se valida en la
-- capa de app, aqui solo se resuelve el registro.
CREATE PROCEDURE SP_RRHH_CONTRATO_OBTENER_POR_TOKEN(
    IN p_token CHAR(36)
)
BEGIN
    SELECT c.*, u.NOMBRES, u.APELLIDOS, u.CORREO,
           e.NRO_DOCUMENTO, e.DIRECCION,
           td.CODIGO AS TIPO_DOCUMENTO_CODIGO, td.DESCRIPCION AS TIPO_DOCUMENTO_DESCRIPCION,
           pa.DESCRIPCION AS PAIS_DESCRIPCION, ci.DESCRIPCION AS CIUDAD_DESCRIPCION,
           tc.CODIGO AS TIPO_CONTRATO_CODIGO, tc.DESCRIPCION AS TIPO_CONTRATO_DESCRIPCION,
           tp.CODIGO AS TIPO_PAGO_LOCADOR_CODIGO, tp.DESCRIPCION AS TIPO_PAGO_LOCADOR_DESCRIPCION,
           ec.CODIGO AS ESTADO_CONTRATO_CODIGO,
           py.NOMBRE AS NOMBRE_PROYECTO, mo.CODIGO AS MONEDA_CODIGO
      FROM RRHH_CONTRATO c
      JOIN USUARIO u ON u.ID_USUARIO = c.ID_USUARIO
      LEFT JOIN RRHH_EMPLEADO e ON e.ID_USUARIO = c.ID_USUARIO
      LEFT JOIN MAESTRO_MAESTRO td ON td.ID_MAESTRO = e.ID_TIPO_DOCUMENTO
      LEFT JOIN MAESTRO_MAESTRO pa ON pa.ID_MAESTRO = e.ID_PAIS
      LEFT JOIN MAESTRO_MAESTRO ci ON ci.ID_MAESTRO = e.ID_CIUDAD
      JOIN MAESTRO_MAESTRO tc ON tc.ID_MAESTRO = c.ID_TIPO_CONTRATO
      LEFT JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = c.ID_TIPO_PAGO_LOCADOR
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
      LEFT JOIN PROYECTO py ON py.ID_PROYECTO = c.ID_PROYECTO
      LEFT JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = c.ID_MONEDA
     WHERE c.TOKEN_FIRMA = p_token
     LIMIT 1;
END$$

-- El token se invalida al firmar (no se puede reusar el link una vez
-- completado). Guarda los datos que la persona completo + el PDF ya
-- generado con su firma.
CREATE PROCEDURE SP_RRHH_CONTRATO_FIRMAR(
    IN p_id_contrato INT UNSIGNED,
    IN p_nro_cuenta VARCHAR(30),
    IN p_cci VARCHAR(30),
    IN p_banco VARCHAR(60),
    IN p_firma_png_path VARCHAR(300),
    IN p_documento_path VARCHAR(300)
)
BEGIN
    DECLARE v_id_firmado INT UNSIGNED;
    SET v_id_firmado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONTRATO' AND CODIGO = 'FIRMADO' LIMIT 1);

    UPDATE RRHH_CONTRATO
       SET NRO_CUENTA = p_nro_cuenta,
           CCI = p_cci,
           BANCO = p_banco,
           FIRMA_PNG_PATH = p_firma_png_path,
           DOCUMENTO_PATH = p_documento_path,
           FECHA_FIRMA = NOW(),
           ID_ESTADO_CONTRATO = v_id_firmado,
           TOKEN_FIRMA = NULL,
           TOKEN_EXPIRA = NULL
     WHERE ID_CONTRATO = p_id_contrato;
END$$

-- Las funciones se pueden agregar/corregir mientras el contrato no se
-- haya firmado (BORRADOR o PENDIENTE_FIRMA) -- una vez FIRMADO el texto
-- ya quedo impreso en el PDF, cambiarlo aca no lo reflejaria. Solo aplica
-- a PLANILLA (ID_TIPO_PAGO_LOCADOR IS NULL) -- un locador de servicios no
-- tiene "funciones" de puesto (no hay subordinacion, es una obligacion de
-- servicio pactada en el propio contrato). No-op silencioso fuera de
-- esos dos estados o para LOCADOR, mismo estilo del resto del sistema
-- (no se usa SIGNAL).
CREATE PROCEDURE SP_RRHH_CONTRATO_ACTUALIZAR_FUNCIONES(
    IN p_id_contrato INT UNSIGNED,
    IN p_funciones TEXT
)
BEGIN
    UPDATE RRHH_CONTRATO c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
       SET c.FUNCIONES = p_funciones
     WHERE c.ID_CONTRATO = p_id_contrato
       AND c.ID_TIPO_PAGO_LOCADOR IS NULL
       AND ec.CODIGO IN ('BORRADOR', 'PENDIENTE_FIRMA');
END$$

-- Copia cargo/funciones/tipo/tarifa/proyecto/datos bancarios del contrato
-- anterior, junto con sus lineas de concepto (planilla) y sus proyectos
-- con tarifa (locador por hora) -- las horas trabajadas NO se copian, son
-- especificas de cada periodo. Fechas son siempre las del nuevo periodo;
-- los montos se ajustan despues desde el detalle del contrato nuevo
-- (agregar/quitar concepto o proyecto). El anterior pasa a RENOVADO y
-- queda enlazado via ID_CONTRATO_ANTERIOR.
CREATE PROCEDURE SP_RRHH_CONTRATO_RENOVAR(
    IN p_id_contrato_anterior INT UNSIGNED,
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    OUT p_id_contrato_nuevo INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_borrador INT UNSIGNED;
    DECLARE v_id_renovado INT UNSIGNED;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_borrador = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONTRATO' AND CODIGO = 'BORRADOR' LIMIT 1);
    SET v_id_renovado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONTRATO' AND CODIGO = 'RENOVADO' LIMIT 1);

    INSERT INTO RRHH_CONTRATO (
        ID_USUARIO, ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, CARGO, FUNCIONES,
        FECHA_INICIO, FECHA_FIN, DIAS_LABORALES, HORA_INICIO, HORA_FIN, NOTA_JORNADA,
        TARIFA, ID_MONEDA, TIPO_CAMBIO, ID_PROYECTO, PERIODO_PAGO, NRO_CUENTA, CCI, BANCO,
        ID_ESTADO_CONTRATO, ID_CONTRATO_ANTERIOR, ID_ESTADO, USUARIO_CREACION
    )
    SELECT
        ID_USUARIO, ID_TIPO_CONTRATO, ID_TIPO_PAGO_LOCADOR, CARGO, FUNCIONES,
        p_fecha_inicio, p_fecha_fin, DIAS_LABORALES, HORA_INICIO, HORA_FIN, NOTA_JORNADA,
        TARIFA, ID_MONEDA, TIPO_CAMBIO, ID_PROYECTO, PERIODO_PAGO, NRO_CUENTA, CCI, BANCO,
        v_id_borrador, p_id_contrato_anterior, v_id_activo, USUARIO_CREACION
      FROM RRHH_CONTRATO
     WHERE ID_CONTRATO = p_id_contrato_anterior;

    SET p_id_contrato_nuevo = LAST_INSERT_ID();

    INSERT INTO RRHH_CONTRATO_CONCEPTO (ID_CONTRATO, ID_CONCEPTO, MONTO, ID_ESTADO)
    SELECT p_id_contrato_nuevo, ID_CONCEPTO, MONTO, v_id_activo
      FROM RRHH_CONTRATO_CONCEPTO
     WHERE ID_CONTRATO = p_id_contrato_anterior AND ID_ESTADO = v_id_activo;

    INSERT INTO RRHH_CONTRATO_PROYECTO (ID_CONTRATO, ID_PROYECTO, TARIFA_HORA, ID_MONEDA, TIPO_CAMBIO, ID_ESTADO)
    SELECT p_id_contrato_nuevo, ID_PROYECTO, TARIFA_HORA, ID_MONEDA, TIPO_CAMBIO, v_id_activo
      FROM RRHH_CONTRATO_PROYECTO
     WHERE ID_CONTRATO = p_id_contrato_anterior AND ID_ESTADO = v_id_activo;

    UPDATE RRHH_CONTRATO SET ID_ESTADO_CONTRATO = v_id_renovado WHERE ID_CONTRATO = p_id_contrato_anterior;
END$$

-- Borrado real solo mientras el contrato sigue BORRADOR/PENDIENTE_FIRMA
-- (todavia no es un documento legal -- nunca se firmo, no genero ningun
-- movimiento de dinero). Un contrato FIRMADO/VENCIDO/RENOVADO/ANULADO
-- nunca se borra de verdad, mismo criterio que PASIVO_CUOTA/RRHH_CONTRATO_
-- PERIODO_PAGO ("borrado real solo mientras no paso nada todavia"). No-op
-- silencioso en cualquier otro estado. SP_RRHH_CONTRATO_RENOVAR siempre
-- crea el contrato nuevo en BORRADOR enlazado via ID_CONTRATO_ANTERIOR al
-- ANTERIOR (nunca al reves), asi que un contrato BORRADOR jamas es el
-- "anterior" de otro -- no hace falta revisar ese FK antes de borrar.
CREATE PROCEDURE SP_RRHH_CONTRATO_ELIMINAR(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    DECLARE v_puede_eliminar INT;

    SELECT COUNT(*) INTO v_puede_eliminar
      FROM RRHH_CONTRATO c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONTRATO
     WHERE c.ID_CONTRATO = p_id_contrato AND ec.CODIGO IN ('BORRADOR', 'PENDIENTE_FIRMA');

    IF v_puede_eliminar = 1 THEN
        DELETE h FROM RRHH_CONTRATO_HORAS h
          JOIN RRHH_CONTRATO_PROYECTO cp ON cp.ID_CONTRATO_PROYECTO = h.ID_CONTRATO_PROYECTO
         WHERE cp.ID_CONTRATO = p_id_contrato;

        DELETE FROM RRHH_CONTRATO_PROYECTO WHERE ID_CONTRATO = p_id_contrato;
        DELETE FROM RRHH_CONTRATO_PERIODO_PAGO WHERE ID_CONTRATO = p_id_contrato;
        DELETE FROM RRHH_CONTRATO_CONCEPTO WHERE ID_CONTRATO = p_id_contrato;
        DELETE FROM RRHH_CONTRATO WHERE ID_CONTRATO = p_id_contrato;
    END IF;
END$$

DELIMITER ;
