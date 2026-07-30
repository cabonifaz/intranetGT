-- =====================================================================
-- Procedimientos de ROL_APLICACION_PERMISO (matriz RBAC).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_ROL_APLICACION_PERMISO_ASIGNAR;
DROP PROCEDURE IF EXISTS SP_ROL_APLICACION_PERMISO_LISTAR;
DROP PROCEDURE IF EXISTS SP_USUARIO_OBTENER_PERMISOS;

DELIMITER $$

CREATE PROCEDURE SP_ROL_APLICACION_PERMISO_ASIGNAR(
    IN p_id_rol INT UNSIGNED,
    IN p_id_aplicacion INT UNSIGNED,
    IN p_id_nivel_permiso INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO ROL_APLICACION_PERMISO (ID_ROL, ID_APLICACION, ID_NIVEL_PERMISO, ID_ESTADO)
    VALUES (p_id_rol, p_id_aplicacion, p_id_nivel_permiso, v_id_activo)
    ON DUPLICATE KEY UPDATE ID_NIVEL_PERMISO = p_id_nivel_permiso, ID_ESTADO = v_id_activo;
END$$

-- Matriz completa (todas las apps activas) con el nivel actual del rol,
-- SIN_ACCESO cuando no hay fila en ROL_APLICACION_PERMISO todavia --
-- pensada para pintar la pantalla de administracion de permisos.
CREATE PROCEDURE SP_ROL_APLICACION_PERMISO_LISTAR(
    IN p_id_rol INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_sin_acceso INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_id_sin_acceso = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'SIN_ACCESO' LIMIT 1);

    SELECT a.ID_APLICACION, a.CODIGO AS APLICACION_CODIGO, a.NOMBRE AS APLICACION_NOMBRE,
           COALESCE(rap.ID_NIVEL_PERMISO, v_id_sin_acceso) AS ID_NIVEL_PERMISO,
           COALESCE(np.CODIGO, 'SIN_ACCESO') AS NIVEL_PERMISO_CODIGO
      FROM APLICACION a
      LEFT JOIN ROL_APLICACION_PERMISO rap ON rap.ID_APLICACION = a.ID_APLICACION AND rap.ID_ROL = p_id_rol AND rap.ID_ESTADO = v_id_activo
      LEFT JOIN MAESTRO_MAESTRO np ON np.ID_MAESTRO = rap.ID_NIVEL_PERMISO
     WHERE a.ID_ESTADO = v_id_activo
     ORDER BY a.ORDEN;
END$$

-- Permisos agregados (maximo entre todos sus roles) de un usuario, usados
-- por lib/rbac para proteger paginas que no son el listado de apps del
-- dashboard (p.ej. /administracion, /rrhh/directorio). Incluye el piso de
-- LECTURA de las apps VISIBLE_TODOS_LOS_ROLES=1, igual que
-- SP_APLICACION_LISTAR_VISIBLES -- deben resolver lo mismo.
CREATE PROCEDURE SP_USUARIO_OBTENER_PERMISOS(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_orden_lectura INT;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_orden_lectura = (SELECT ORDEN FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'LECTURA' LIMIT 1);

    SELECT a.CODIGO AS APLICACION_CODIGO,
           GREATEST(COALESCE(mx.MAX_ORDEN, 0), IF(a.VISIBLE_TODOS_LOS_ROLES = 1, v_orden_lectura, 0)) AS NIVEL_PERMISO_ORDEN
      FROM APLICACION a
      LEFT JOIN (
          SELECT rap.ID_APLICACION, MAX(np.ORDEN) AS MAX_ORDEN
            FROM USUARIO_ROL ur
            JOIN ROL_APLICACION_PERMISO rap ON rap.ID_ROL = ur.ID_ROL AND rap.ID_ESTADO = v_id_activo
            JOIN MAESTRO_MAESTRO np ON np.ID_MAESTRO = rap.ID_NIVEL_PERMISO
           WHERE ur.ID_USUARIO = p_id_usuario AND ur.ID_ESTADO = v_id_activo
           GROUP BY rap.ID_APLICACION
      ) mx ON mx.ID_APLICACION = a.ID_APLICACION
     WHERE a.ID_ESTADO = v_id_activo
       AND (mx.MAX_ORDEN IS NOT NULL OR a.VISIBLE_TODOS_LOS_ROLES = 1);
END$$

DELIMITER ;
