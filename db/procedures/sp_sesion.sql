-- =====================================================================
-- Procedimientos de SESION.
-- Regla de expiracion (confirmada con el usuario):
--   - Dentro del horario laboral efectivo del usuario: la sesion se
--     renueva sola en cada actividad y expira a la hora de fin de turno
--     de hoy, sin importar inactividad.
--   - Fuera de ese horario (antes de entrar, despues de salir, o si no
--     tiene horario configurado): respaldo de 30 minutos de inactividad.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_SESION_HORARIO_EFECTIVO_INTERNO;
DROP PROCEDURE IF EXISTS SP_SESION_CREAR;
DROP PROCEDURE IF EXISTS SP_SESION_RENOVAR;
DROP PROCEDURE IF EXISTS SP_SESION_OBTENER;
DROP PROCEDURE IF EXISTS SP_SESION_CERRAR;
DROP PROCEDURE IF EXISTS SP_SESION_CERRAR_TODAS_USUARIO;
DROP PROCEDURE IF EXISTS SP_SESION_LISTAR_ACTIVAS_USUARIO;

DELIMITER $$

-- Calcula HORA_INICIO/HORA_FIN efectivos de un usuario para "ahora",
-- priorizando su override propio sobre el horario de su rol principal.
CREATE PROCEDURE SP_SESION_HORARIO_EFECTIVO_INTERNO(
    IN p_id_usuario INT UNSIGNED,
    IN p_ahora DATETIME,
    IN p_id_activo INT UNSIGNED,
    OUT p_hora_inicio TIME,
    OUT p_hora_fin TIME
)
BEGIN
    DECLARE v_id_dia INT UNSIGNED;
    DECLARE v_id_rol_principal INT UNSIGNED;

    SET v_id_dia = (
        SELECT ID_MAESTRO FROM MAESTRO_MAESTRO
         WHERE TIPO_MAESTRO = 'DIA_SEMANA'
           AND CODIGO = ELT(DAYOFWEEK(p_ahora), 'DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB')
         LIMIT 1
    );
    SELECT ID_ROL INTO v_id_rol_principal
      FROM USUARIO_ROL
     WHERE ID_USUARIO = p_id_usuario AND ES_PRINCIPAL = 1 AND ID_ESTADO = p_id_activo
     LIMIT 1;

    SELECT COALESCE(hu.HORA_INICIO, hr.HORA_INICIO), COALESCE(hu.HORA_FIN, hr.HORA_FIN)
      INTO p_hora_inicio, p_hora_fin
      FROM (SELECT 1 AS DUMMY) d
      LEFT JOIN HORARIO_LABORAL hu
             ON hu.ID_USUARIO = p_id_usuario AND hu.ID_DIA_SEMANA = v_id_dia AND hu.ID_ESTADO = p_id_activo
      LEFT JOIN HORARIO_LABORAL hr
             ON hr.ID_ROL = v_id_rol_principal AND hr.ID_DIA_SEMANA = v_id_dia AND hr.ID_ESTADO = p_id_activo
     LIMIT 1;
END$$

-- p_id_sesion lo genera la aplicacion (crypto.randomUUID()), no la BD:
-- el JWT de sesion necesita "sid" para poder calcular su propio hash de
-- token ANTES de insertar la fila, asi que no puede depender de un UUID()
-- generado dentro del INSERT.
CREATE PROCEDURE SP_SESION_CREAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_id_sesion CHAR(36),
    IN p_token_hash CHAR(64),
    IN p_ip VARCHAR(45),
    IN p_user_agent VARCHAR(255),
    OUT p_fecha_expiracion DATETIME
)
BEGIN
    DECLARE v_ahora DATETIME DEFAULT NOW();
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_estado_activa INT UNSIGNED;
    DECLARE v_hora_inicio TIME;
    DECLARE v_hora_fin TIME;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_estado_activa = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_SESION' AND CODIGO = 'ACTIVA' LIMIT 1);

    CALL SP_SESION_HORARIO_EFECTIVO_INTERNO(p_id_usuario, v_ahora, v_id_activo, v_hora_inicio, v_hora_fin);

    IF v_hora_inicio IS NOT NULL AND v_hora_fin IS NOT NULL AND CURTIME(6) BETWEEN v_hora_inicio AND v_hora_fin THEN
        SET p_fecha_expiracion = TIMESTAMP(CURDATE(), v_hora_fin);
    ELSE
        SET p_fecha_expiracion = DATE_ADD(v_ahora, INTERVAL 30 MINUTE);
    END IF;

    INSERT INTO SESION (ID_SESION, ID_USUARIO, TOKEN_HASH, IP_ORIGEN, USER_AGENT, FECHA_INICIO, FECHA_ULTIMA_ACTIVIDAD, FECHA_EXPIRACION, ID_ESTADO_SESION)
    VALUES (p_id_sesion, p_id_usuario, p_token_hash, p_ip, p_user_agent, v_ahora, v_ahora, p_fecha_expiracion, v_id_estado_activa);
END$$

-- Se invoca en (casi) cada request autenticado. p_dentro_horario indica al
-- caller si la sesion esta corriendo en modo "fijo hasta fin de turno" (1)
-- o en modo "respaldo 30min de inactividad" (0). Si la sesion ya no es
-- valida (expirada/cerrada), p_fecha_expiracion vuelve NULL.
CREATE PROCEDURE SP_SESION_RENOVAR(
    IN p_id_sesion CHAR(36),
    OUT p_fecha_expiracion DATETIME,
    OUT p_dentro_horario TINYINT
)
BEGIN
    DECLARE v_ahora DATETIME DEFAULT NOW();
    DECLARE v_id_usuario INT UNSIGNED;
    DECLARE v_ultima_actividad DATETIME;
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_estado_expirada INT UNSIGNED;
    DECLARE v_hora_inicio TIME;
    DECLARE v_hora_fin TIME;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    SELECT s.ID_USUARIO, s.FECHA_ULTIMA_ACTIVIDAD INTO v_id_usuario, v_ultima_actividad
      FROM SESION s
      JOIN MAESTRO_MAESTRO es ON es.ID_MAESTRO = s.ID_ESTADO_SESION
     WHERE s.ID_SESION = p_id_sesion AND es.CODIGO = 'ACTIVA'
     FOR UPDATE;

    IF v_id_usuario IS NULL THEN
        SET p_fecha_expiracion = NULL;
        SET p_dentro_horario = 0;
    ELSE
        CALL SP_SESION_HORARIO_EFECTIVO_INTERNO(v_id_usuario, v_ahora, v_id_activo, v_hora_inicio, v_hora_fin);

        IF v_hora_inicio IS NOT NULL AND v_hora_fin IS NOT NULL AND CURTIME(6) BETWEEN v_hora_inicio AND v_hora_fin THEN
            SET p_dentro_horario = 1;
            SET p_fecha_expiracion = TIMESTAMP(CURDATE(), v_hora_fin);
            UPDATE SESION SET FECHA_ULTIMA_ACTIVIDAD = v_ahora, FECHA_EXPIRACION = p_fecha_expiracion WHERE ID_SESION = p_id_sesion;
        ELSE
            SET p_dentro_horario = 0;
            IF TIMESTAMPDIFF(MINUTE, v_ultima_actividad, v_ahora) > 30 THEN
                SET v_id_estado_expirada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_SESION' AND CODIGO = 'EXPIRADA' LIMIT 1);
                UPDATE SESION SET ID_ESTADO_SESION = v_id_estado_expirada, FECHA_CIERRE = v_ahora WHERE ID_SESION = p_id_sesion;
                SET p_fecha_expiracion = NULL;
            ELSE
                SET p_fecha_expiracion = DATE_ADD(v_ahora, INTERVAL 30 MINUTE);
                UPDATE SESION SET FECHA_ULTIMA_ACTIVIDAD = v_ahora, FECHA_EXPIRACION = p_fecha_expiracion WHERE ID_SESION = p_id_sesion;
            END IF;
        END IF;
    END IF;
END$$

-- Validacion autoritativa de una sesion a partir del hash del token de la
-- cookie. No renueva nada, solo lee el estado actual + datos del usuario.
CREATE PROCEDURE SP_SESION_OBTENER(
    IN p_token_hash CHAR(64)
)
BEGIN
    SELECT s.ID_SESION, s.ID_USUARIO, s.FECHA_EXPIRACION, s.FECHA_ULTIMA_ACTIVIDAD,
           es.CODIGO AS ESTADO_SESION_CODIGO,
           u.USUARIO, u.NOMBRES, u.APELLIDOS, u.ID_ESTADO_USUARIO, eu.CODIGO AS ESTADO_USUARIO_CODIGO
      FROM SESION s
      JOIN MAESTRO_MAESTRO es ON es.ID_MAESTRO = s.ID_ESTADO_SESION
      JOIN USUARIO u ON u.ID_USUARIO = s.ID_USUARIO
      JOIN MAESTRO_MAESTRO eu ON eu.ID_MAESTRO = u.ID_ESTADO_USUARIO
     WHERE s.TOKEN_HASH = p_token_hash
     LIMIT 1;
END$$

CREATE PROCEDURE SP_SESION_CERRAR(
    IN p_id_sesion CHAR(36),
    IN p_motivo VARCHAR(20)
)
BEGIN
    DECLARE v_codigo VARCHAR(20);
    DECLARE v_id_estado INT UNSIGNED;

    SET v_codigo = IF(p_motivo = 'FORZADO', 'CERRADA_FORZADA', 'CERRADA');
    SET v_id_estado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_SESION' AND CODIGO = v_codigo LIMIT 1);

    UPDATE SESION
       SET ID_ESTADO_SESION = v_id_estado, FECHA_CIERRE = NOW()
     WHERE ID_SESION = p_id_sesion;
END$$

CREATE PROCEDURE SP_SESION_CERRAR_TODAS_USUARIO(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    DECLARE v_id_estado_forzada INT UNSIGNED;
    DECLARE v_id_estado_activa INT UNSIGNED;

    SET v_id_estado_forzada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_SESION' AND CODIGO = 'CERRADA_FORZADA' LIMIT 1);
    SET v_id_estado_activa = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_SESION' AND CODIGO = 'ACTIVA' LIMIT 1);

    UPDATE SESION
       SET ID_ESTADO_SESION = v_id_estado_forzada, FECHA_CIERRE = NOW()
     WHERE ID_USUARIO = p_id_usuario AND ID_ESTADO_SESION = v_id_estado_activa;
END$$

CREATE PROCEDURE SP_SESION_LISTAR_ACTIVAS_USUARIO(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    SELECT s.ID_SESION, s.IP_ORIGEN, s.USER_AGENT, s.FECHA_INICIO, s.FECHA_ULTIMA_ACTIVIDAD, s.FECHA_EXPIRACION
      FROM SESION s
      JOIN MAESTRO_MAESTRO es ON es.ID_MAESTRO = s.ID_ESTADO_SESION
     WHERE s.ID_USUARIO = p_id_usuario AND es.CODIGO = 'ACTIVA'
     ORDER BY s.FECHA_ULTIMA_ACTIVIDAD DESC;
END$$

DELIMITER ;
