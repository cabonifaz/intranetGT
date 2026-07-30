-- =====================================================================
-- Procedimientos de HORARIO_LABORAL.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_HORARIO_OBTENER_EFECTIVO;
DROP PROCEDURE IF EXISTS SP_HORARIO_LABORAL_ASIGNAR;

DELIMITER $$

-- Resuelve el horario vigente de un usuario para una fecha dada:
-- prioridad 1) override propio del usuario, 2) horario de su rol principal.
-- Si no hay horario configurado en ninguno de los dos, retorna filas vacias
-- (la app/otros SPs lo tratan como "siempre fuera de horario", regla segura
-- por defecto: se aplica el respaldo de 30 min de inactividad).
CREATE PROCEDURE SP_HORARIO_OBTENER_EFECTIVO(
    IN p_id_usuario INT UNSIGNED,
    IN p_fecha DATE
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_dia INT UNSIGNED;
    DECLARE v_id_rol_principal INT UNSIGNED;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_dia = (
        SELECT ID_MAESTRO FROM MAESTRO_MAESTRO
         WHERE TIPO_MAESTRO = 'DIA_SEMANA'
           AND CODIGO = ELT(DAYOFWEEK(p_fecha), 'DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB')
         LIMIT 1
    );
    SELECT ID_ROL INTO v_id_rol_principal
      FROM USUARIO_ROL
     WHERE ID_USUARIO = p_id_usuario AND ES_PRINCIPAL = 1 AND ID_ESTADO = v_id_activo
     LIMIT 1;

    -- COALESCE en vez de ROW_COUNT() (ROW_COUNT() no es fiable tras un SELECT):
    -- prioridad 1) override del propio usuario, 2) horario de su rol principal.
    SELECT COALESCE(hu.HORA_INICIO, hr.HORA_INICIO) AS HORA_INICIO,
           COALESCE(hu.HORA_FIN, hr.HORA_FIN) AS HORA_FIN
      FROM (SELECT 1 AS DUMMY) d
      LEFT JOIN HORARIO_LABORAL hu
             ON hu.ID_USUARIO = p_id_usuario AND hu.ID_DIA_SEMANA = v_id_dia AND hu.ID_ESTADO = v_id_activo
      LEFT JOIN HORARIO_LABORAL hr
             ON hr.ID_ROL = v_id_rol_principal AND hr.ID_DIA_SEMANA = v_id_dia AND hr.ID_ESTADO = v_id_activo
     LIMIT 1;
END$$

CREATE PROCEDURE SP_HORARIO_LABORAL_ASIGNAR(
    IN p_id_rol INT UNSIGNED,
    IN p_id_usuario INT UNSIGNED,
    IN p_dia_codigo VARCHAR(10),
    IN p_hora_inicio TIME,
    IN p_hora_fin TIME
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_dia INT UNSIGNED;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_dia = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'DIA_SEMANA' AND CODIGO = p_dia_codigo LIMIT 1);

    INSERT INTO HORARIO_LABORAL (ID_ROL, ID_USUARIO, ID_DIA_SEMANA, HORA_INICIO, HORA_FIN, ID_ESTADO)
    VALUES (p_id_rol, p_id_usuario, v_id_dia, p_hora_inicio, p_hora_fin, v_id_activo);
END$$

DELIMITER ;
