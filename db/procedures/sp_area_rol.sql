-- =====================================================================
-- Procedimientos de AREA y ROL para la pantalla de administracion.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_AREA_LISTAR;
DROP PROCEDURE IF EXISTS SP_AREA_CREAR;
DROP PROCEDURE IF EXISTS SP_ROL_LISTAR;
DROP PROCEDURE IF EXISTS SP_ROL_LISTAR_POR_AREA;
DROP PROCEDURE IF EXISTS SP_ROL_CREAR;

DELIMITER $$

CREATE PROCEDURE SP_AREA_LISTAR(
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT a.ID_AREA, a.CODIGO, a.NOMBRE, a.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO, a.ORDEN
      FROM AREA a
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = a.ID_ESTADO
     WHERE (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY a.ORDEN;
END$$

-- No-op silencioso si ya existe una AREA con ese CODIGO (UQ_AREA_CODIGO)
-- -- p_id_area queda NULL, la capa de aplicacion lo traduce en un
-- mensaje claro en vez de dejar pasar el error crudo de MySQL.
CREATE PROCEDURE SP_AREA_CREAR(
    IN p_codigo VARCHAR(30),
    IN p_nombre VARCHAR(100),
    IN p_orden INT,
    OUT p_id_area INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    IF NOT EXISTS (SELECT 1 FROM AREA WHERE CODIGO = p_codigo) THEN
        INSERT INTO AREA (CODIGO, NOMBRE, ID_ESTADO, ORDEN) VALUES (p_codigo, p_nombre, v_id_activo, p_orden);
        SET p_id_area = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_ROL_LISTAR(
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT r.ID_ROL, r.ID_AREA, ar.NOMBRE AS AREA_NOMBRE, r.CODIGO, r.NOMBRE,
           r.NIVEL_JERARQUICO, r.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM ROL r
      JOIN AREA ar ON ar.ID_AREA = r.ID_AREA
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = r.ID_ESTADO
     WHERE (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY ar.ORDEN, r.ORDEN;
END$$

CREATE PROCEDURE SP_ROL_LISTAR_POR_AREA(
    IN p_id_area INT UNSIGNED
)
BEGIN
    SELECT r.ID_ROL, r.CODIGO, r.NOMBRE, r.NIVEL_JERARQUICO
      FROM ROL r
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = r.ID_ESTADO
     WHERE r.ID_AREA = p_id_area AND e.CODIGO = 'ACTIVO'
     ORDER BY r.ORDEN;
END$$

-- No-op silencioso si ya existe un ROL con ese CODIGO en la misma AREA
-- (UQ_ROL_AREA_CODIGO) -- p_id_rol queda NULL, mismo criterio que
-- SP_AREA_CREAR.
CREATE PROCEDURE SP_ROL_CREAR(
    IN p_id_area INT UNSIGNED,
    IN p_codigo VARCHAR(50),
    IN p_nombre VARCHAR(100),
    IN p_nivel_jerarquico INT,
    OUT p_id_rol INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    IF NOT EXISTS (SELECT 1 FROM ROL WHERE ID_AREA = p_id_area AND CODIGO = p_codigo) THEN
        INSERT INTO ROL (ID_AREA, CODIGO, NOMBRE, NIVEL_JERARQUICO, ID_ESTADO)
        VALUES (p_id_area, p_codigo, p_nombre, p_nivel_jerarquico, v_id_activo);
        SET p_id_rol = LAST_INSERT_ID();
    END IF;
END$$

DELIMITER ;
