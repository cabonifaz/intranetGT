-- =====================================================================
-- Procedimientos de NOTIFICACION / NOTIFICACION_USUARIO.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_NOTIFICACION_CREAR;
DROP PROCEDURE IF EXISTS SP_NOTIFICACION_LISTAR_POR_USUARIO;
DROP PROCEDURE IF EXISTS SP_NOTIFICACION_MARCAR_LEIDA;
DROP PROCEDURE IF EXISTS SP_NOTIFICACION_MARCAR_TODAS_LEIDAS;
DROP PROCEDURE IF EXISTS SP_NOTIFICACION_CONTAR_NO_LEIDAS;

DELIMITER $$

-- p_destinatarios_json admite claves opcionales "usuarios", "roles" y
-- "areas" (cada una un array de IDs, p.ej. {"usuarios":[1,2],"roles":[3]})
-- y "todos":true para difundir a TODOS los usuarios activos sin importar
-- area/rol. Se hace fan-out a NOTIFICACION_USUARIO por las cuatro vias
-- (INSERT IGNORE evita duplicados si un usuario califica por mas de una).
CREATE PROCEDURE SP_NOTIFICACION_CREAR(
    IN p_id_categoria INT UNSIGNED,
    IN p_titulo VARCHAR(150),
    IN p_mensaje VARCHAR(500),
    IN p_id_aplicacion_origen INT UNSIGNED,
    IN p_url_destino VARCHAR(300),
    IN p_id_usuario_emisor INT UNSIGNED,
    IN p_destinatarios_json JSON,
    OUT p_id_notificacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO NOTIFICACION (ID_CATEGORIA, TITULO, MENSAJE, ID_APLICACION_ORIGEN, URL_DESTINO, ID_USUARIO_EMISOR, ID_ESTADO)
    VALUES (p_id_categoria, p_titulo, p_mensaje, p_id_aplicacion_origen, p_url_destino, p_id_usuario_emisor, v_id_activo);

    SET p_id_notificacion = LAST_INSERT_ID();

    INSERT IGNORE INTO NOTIFICACION_USUARIO (ID_NOTIFICACION, ID_USUARIO)
    SELECT p_id_notificacion, jt.ID_USUARIO
      FROM JSON_TABLE(p_destinatarios_json, '$.usuarios[*]' COLUMNS (ID_USUARIO INT UNSIGNED PATH '$')) jt;

    INSERT IGNORE INTO NOTIFICACION_USUARIO (ID_NOTIFICACION, ID_USUARIO)
    SELECT DISTINCT p_id_notificacion, ur.ID_USUARIO
      FROM JSON_TABLE(p_destinatarios_json, '$.roles[*]' COLUMNS (ID_ROL INT UNSIGNED PATH '$')) jt
      JOIN USUARIO_ROL ur ON ur.ID_ROL = jt.ID_ROL AND ur.ID_ESTADO = v_id_activo;

    INSERT IGNORE INTO NOTIFICACION_USUARIO (ID_NOTIFICACION, ID_USUARIO)
    SELECT DISTINCT p_id_notificacion, ur.ID_USUARIO
      FROM JSON_TABLE(p_destinatarios_json, '$.areas[*]' COLUMNS (ID_AREA INT UNSIGNED PATH '$')) jt
      JOIN ROL r ON r.ID_AREA = jt.ID_AREA
      JOIN USUARIO_ROL ur ON ur.ID_ROL = r.ID_ROL AND ur.ID_ESTADO = v_id_activo;

    IF JSON_UNQUOTE(JSON_EXTRACT(p_destinatarios_json, '$.todos')) = 'true' THEN
        INSERT IGNORE INTO NOTIFICACION_USUARIO (ID_NOTIFICACION, ID_USUARIO)
        SELECT p_id_notificacion, u.ID_USUARIO
          FROM USUARIO u
          JOIN MAESTRO_MAESTRO eu ON eu.ID_MAESTRO = u.ID_ESTADO_USUARIO
         WHERE eu.CODIGO = 'ACTIVO';
    END IF;
END$$

CREATE PROCEDURE SP_NOTIFICACION_LISTAR_POR_USUARIO(
    IN p_id_usuario INT UNSIGNED,
    IN p_solo_no_leidas TINYINT,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    SELECT nu.ID_NOTIFICACION_USUARIO, n.ID_NOTIFICACION, n.TITULO, n.MENSAJE, n.URL_DESTINO,
           n.FECHA_CREACION, nu.LEIDA, nu.FECHA_LECTURA,
           c.CODIGO AS CATEGORIA_CODIGO, c.DESCRIPCION AS CATEGORIA_DESCRIPCION
      FROM NOTIFICACION_USUARIO nu
      JOIN NOTIFICACION n ON n.ID_NOTIFICACION = nu.ID_NOTIFICACION
      JOIN MAESTRO_MAESTRO c ON c.ID_MAESTRO = n.ID_CATEGORIA
     WHERE nu.ID_USUARIO = p_id_usuario
       AND (p_solo_no_leidas = 0 OR nu.LEIDA = 0)
     ORDER BY n.FECHA_CREACION DESC
     LIMIT p_limite OFFSET p_offset;
END$$

CREATE PROCEDURE SP_NOTIFICACION_MARCAR_LEIDA(
    IN p_id_notificacion_usuario INT UNSIGNED,
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    UPDATE NOTIFICACION_USUARIO
       SET LEIDA = 1, FECHA_LECTURA = NOW()
     WHERE ID_NOTIFICACION_USUARIO = p_id_notificacion_usuario AND ID_USUARIO = p_id_usuario;
END$$

CREATE PROCEDURE SP_NOTIFICACION_MARCAR_TODAS_LEIDAS(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    UPDATE NOTIFICACION_USUARIO
       SET LEIDA = 1, FECHA_LECTURA = NOW()
     WHERE ID_USUARIO = p_id_usuario AND LEIDA = 0;
END$$

CREATE PROCEDURE SP_NOTIFICACION_CONTAR_NO_LEIDAS(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    SELECT COUNT(*) AS TOTAL
      FROM NOTIFICACION_USUARIO
     WHERE ID_USUARIO = p_id_usuario AND LEIDA = 0;
END$$

DELIMITER ;
