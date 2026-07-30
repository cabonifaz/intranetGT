-- =====================================================================
-- Procedimientos del catalogo generico MAESTRO_MAESTRO.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_MAESTRO_LISTAR;
DROP PROCEDURE IF EXISTS SP_MAESTRO_LISTAR_HIJOS;
DROP PROCEDURE IF EXISTS SP_MAESTRO_OBTENER;
DROP PROCEDURE IF EXISTS SP_MAESTRO_CREAR;
DROP PROCEDURE IF EXISTS SP_MAESTRO_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_MAESTRO_CAMBIAR_ESTADO;

DELIMITER $$

CREATE PROCEDURE SP_MAESTRO_LISTAR(
    IN p_tipo_maestro VARCHAR(50),
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT m.ID_MAESTRO, m.TIPO_MAESTRO, m.ID_PADRE, m.CODIGO, m.DESCRIPCION,
           m.ORDEN, m.METADATA, m.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM MAESTRO_MAESTRO m
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = m.ID_ESTADO
     WHERE m.TIPO_MAESTRO = p_tipo_maestro
       AND (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY m.ORDEN, m.DESCRIPCION;
END$$

-- Usado para catalogos jerarquicos (ej. CIUDAD segun su PAIS padre).
CREATE PROCEDURE SP_MAESTRO_LISTAR_HIJOS(
    IN p_tipo_maestro VARCHAR(50),
    IN p_id_padre INT UNSIGNED
)
BEGIN
    SELECT m.ID_MAESTRO, m.TIPO_MAESTRO, m.ID_PADRE, m.CODIGO, m.DESCRIPCION,
           m.ORDEN, m.METADATA, m.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM MAESTRO_MAESTRO m
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = m.ID_ESTADO
     WHERE m.TIPO_MAESTRO = p_tipo_maestro
       AND m.ID_PADRE = p_id_padre
       AND e.CODIGO = 'ACTIVO'
     ORDER BY m.ORDEN, m.DESCRIPCION;
END$$

CREATE PROCEDURE SP_MAESTRO_OBTENER(
    IN p_id_maestro INT UNSIGNED
)
BEGIN
    SELECT m.ID_MAESTRO, m.TIPO_MAESTRO, m.ID_PADRE, m.CODIGO, m.DESCRIPCION,
           m.ORDEN, m.METADATA, m.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM MAESTRO_MAESTRO m
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = m.ID_ESTADO
     WHERE m.ID_MAESTRO = p_id_maestro;
END$$

-- No-op silencioso si ya existe una fila con el mismo TIPO_MAESTRO+CODIGO
-- (UQ_MAESTRO_TIPO_CODIGO) -- p_id_maestro queda NULL, mismo criterio
-- que SP_AREA_CREAR/SP_ROL_CREAR.
CREATE PROCEDURE SP_MAESTRO_CREAR(
    IN p_tipo_maestro VARCHAR(50),
    IN p_codigo VARCHAR(50),
    IN p_descripcion VARCHAR(200),
    IN p_orden INT,
    IN p_id_padre INT UNSIGNED,
    IN p_metadata_json JSON,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_maestro INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    IF NOT EXISTS (SELECT 1 FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = p_tipo_maestro AND CODIGO = p_codigo) THEN
        INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, ID_PADRE, CODIGO, DESCRIPCION, ORDEN, METADATA, ID_ESTADO, USUARIO_CREACION)
        VALUES (p_tipo_maestro, p_id_padre, p_codigo, p_descripcion, p_orden, p_metadata_json, v_id_activo, p_id_usuario_creacion);

        SET p_id_maestro = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_MAESTRO_ACTUALIZAR(
    IN p_id_maestro INT UNSIGNED,
    IN p_codigo VARCHAR(50),
    IN p_descripcion VARCHAR(200),
    IN p_orden INT,
    IN p_metadata_json JSON,
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE MAESTRO_MAESTRO
       SET CODIGO = p_codigo,
           DESCRIPCION = p_descripcion,
           ORDEN = p_orden,
           METADATA = p_metadata_json,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_MAESTRO = p_id_maestro;
END$$

CREATE PROCEDURE SP_MAESTRO_CAMBIAR_ESTADO(
    IN p_id_maestro INT UNSIGNED,
    IN p_id_estado INT UNSIGNED,
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE MAESTRO_MAESTRO
       SET ID_ESTADO = p_id_estado,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_MAESTRO = p_id_maestro;
END$$

DELIMITER ;
