-- =====================================================================
-- Procedimientos de APLICACION (modulos internos + apps externas).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_APLICACION_CREAR;
DROP PROCEDURE IF EXISTS SP_APLICACION_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_APLICACION_LISTAR;
DROP PROCEDURE IF EXISTS SP_APLICACION_LISTAR_VISIBLES;

DELIMITER $$

-- Al crear una aplicacion se le otorga ADMIN automaticamente al rol
-- SUPER_ADMIN sobre ella (misma transaccion), asi el chequeo de permisos
-- se mantiene uniforme para todos los roles: sin bypass hardcodeado en
-- el codigo de la app. No-op silencioso si ya existe una APLICACION con
-- ese CODIGO (UQ_APLICACION_CODIGO) -- p_id_aplicacion queda NULL, mismo
-- criterio que SP_AREA_CREAR/SP_ROL_CREAR/SP_MAESTRO_CREAR.
CREATE PROCEDURE SP_APLICACION_CREAR(
    IN p_codigo VARCHAR(50),
    IN p_nombre VARCHAR(100),
    IN p_descripcion VARCHAR(300),
    IN p_icono VARCHAR(50),
    IN p_id_tipo_aplicacion INT UNSIGNED,
    IN p_ruta_interna VARCHAR(200),
    IN p_url_externa VARCHAR(300),
    IN p_id_area_propietaria INT UNSIGNED,
    IN p_requiere_sso TINYINT,
    OUT p_id_aplicacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_id_nivel_admin INT UNSIGNED;
    DECLARE v_id_rol_super INT UNSIGNED;

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    IF NOT EXISTS (SELECT 1 FROM APLICACION WHERE CODIGO = p_codigo) THEN
        INSERT INTO APLICACION (CODIGO, NOMBRE, DESCRIPCION, ICONO, ID_TIPO_APLICACION, RUTA_INTERNA, URL_EXTERNA, ID_AREA_PROPIETARIA, REQUIERE_SSO, ID_ESTADO)
        VALUES (p_codigo, p_nombre, p_descripcion, p_icono, p_id_tipo_aplicacion, p_ruta_interna, p_url_externa, p_id_area_propietaria, p_requiere_sso, v_id_activo);

        SET p_id_aplicacion = LAST_INSERT_ID();

        SET v_id_nivel_admin = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ADMIN' LIMIT 1);
        SELECT ID_ROL INTO v_id_rol_super FROM ROL WHERE CODIGO = 'SUPER_ADMIN' LIMIT 1;

        IF v_id_rol_super IS NOT NULL THEN
            INSERT INTO ROL_APLICACION_PERMISO (ID_ROL, ID_APLICACION, ID_NIVEL_PERMISO, ID_ESTADO)
            VALUES (v_id_rol_super, p_id_aplicacion, v_id_nivel_admin, v_id_activo)
            ON DUPLICATE KEY UPDATE ID_NIVEL_PERMISO = v_id_nivel_admin, ID_ESTADO = v_id_activo;
        END IF;
    END IF;
END$$

CREATE PROCEDURE SP_APLICACION_ACTUALIZAR(
    IN p_id_aplicacion INT UNSIGNED,
    IN p_nombre VARCHAR(100),
    IN p_descripcion VARCHAR(300),
    IN p_icono VARCHAR(50),
    IN p_ruta_interna VARCHAR(200),
    IN p_url_externa VARCHAR(300),
    IN p_id_estado INT UNSIGNED
)
BEGIN
    UPDATE APLICACION
       SET NOMBRE = p_nombre,
           DESCRIPCION = p_descripcion,
           ICONO = p_icono,
           RUTA_INTERNA = p_ruta_interna,
           URL_EXTERNA = p_url_externa,
           ID_ESTADO = p_id_estado
     WHERE ID_APLICACION = p_id_aplicacion;
END$$

CREATE PROCEDURE SP_APLICACION_LISTAR(
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT a.ID_APLICACION, a.CODIGO, a.NOMBRE, a.DESCRIPCION, a.ICONO,
           ta.CODIGO AS TIPO_APLICACION_CODIGO, a.RUTA_INTERNA, a.URL_EXTERNA, a.REQUIERE_SSO,
           ar.ID_AREA, ar.NOMBRE AS AREA_NOMBRE, a.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO, a.ORDEN
      FROM APLICACION a
      JOIN MAESTRO_MAESTRO ta ON ta.ID_MAESTRO = a.ID_TIPO_APLICACION
      JOIN AREA ar ON ar.ID_AREA = a.ID_AREA_PROPIETARIA
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = a.ID_ESTADO
     WHERE (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY ar.ORDEN, a.ORDEN;
END$$

-- Apps que el usuario puede ver: agrega el maximo nivel de permiso entre
-- todos sus roles activos, con un piso de LECTURA si la app tiene
-- VISIBLE_TODOS_LOS_ROLES=1 (ej. el directorio de empleados: todos
-- navegan, RRHH conserva su nivel real si es mayor). Descarta SIN_ACCESO.
CREATE PROCEDURE SP_APLICACION_LISTAR_VISIBLES(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_orden_lectura INT;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_orden_lectura = (SELECT ORDEN FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'LECTURA' LIMIT 1);

    SELECT a.ID_APLICACION, a.CODIGO, a.NOMBRE, a.DESCRIPCION, a.ICONO,
           ta.CODIGO AS TIPO_APLICACION_CODIGO, a.RUTA_INTERNA, a.URL_EXTERNA, a.REQUIERE_SSO,
           ar.ID_AREA, ar.NOMBRE AS AREA_NOMBRE, ar.ORDEN AS AREA_ORDEN,
           np.CODIGO AS NIVEL_PERMISO_CODIGO, efectivo.ORDEN_EFECTIVO AS NIVEL_PERMISO_ORDEN
      FROM APLICACION a
      JOIN MAESTRO_MAESTRO ta ON ta.ID_MAESTRO = a.ID_TIPO_APLICACION
      JOIN AREA ar ON ar.ID_AREA = a.ID_AREA_PROPIETARIA
      JOIN (
          SELECT ap.ID_APLICACION,
                 GREATEST(COALESCE(mx.MAX_ORDEN, 0), IF(ap.VISIBLE_TODOS_LOS_ROLES = 1, v_orden_lectura, 0)) AS ORDEN_EFECTIVO
            FROM APLICACION ap
            LEFT JOIN (
                SELECT rap.ID_APLICACION, MAX(np_inner.ORDEN) AS MAX_ORDEN
                  FROM USUARIO_ROL ur
                  JOIN ROL_APLICACION_PERMISO rap ON rap.ID_ROL = ur.ID_ROL AND rap.ID_ESTADO = v_id_activo
                  JOIN MAESTRO_MAESTRO np_inner ON np_inner.ID_MAESTRO = rap.ID_NIVEL_PERMISO
                 WHERE ur.ID_USUARIO = p_id_usuario AND ur.ID_ESTADO = v_id_activo
                 GROUP BY rap.ID_APLICACION
            ) mx ON mx.ID_APLICACION = ap.ID_APLICACION
      ) efectivo ON efectivo.ID_APLICACION = a.ID_APLICACION
      JOIN MAESTRO_MAESTRO np ON np.TIPO_MAESTRO = 'NIVEL_PERMISO' AND np.ORDEN = efectivo.ORDEN_EFECTIVO
     WHERE a.ID_ESTADO = v_id_activo AND np.CODIGO <> 'SIN_ACCESO'
     ORDER BY ar.ORDEN, a.ORDEN;
END$$

DELIMITER ;
