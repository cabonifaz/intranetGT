-- =====================================================================
-- Procedimientos del Directorio Corporativo (modulo RRHH).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_EMPLEADO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_EMPLEADO_OBTENER;
DROP PROCEDURE IF EXISTS SP_RRHH_EMPLEADO_UPSERT;

DELIMITER $$

-- LEFT JOIN a RRHH_EMPLEADO: todo usuario activo aparece en el directorio
-- aunque RRHH aun no le haya completado la ficha (telefono NULL, etc).
-- PUESTO ya no es columna propia -- es el nombre del rol principal
-- (ROL_NOMBRE), la misma columna que ya se calcula para RBAC.
CREATE PROCEDURE SP_RRHH_EMPLEADO_LISTAR(
    IN p_id_area INT UNSIGNED,
    IN p_busqueda VARCHAR(100)
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    SELECT u.ID_USUARIO, u.NOMBRES, u.APELLIDOS, u.CORREO,
           ar.ID_AREA, ar.NOMBRE AS AREA_NOMBRE, r.NOMBRE AS ROL_NOMBRE,
           e.TELEFONO, e.EXTENSION, e.FOTO_URL,
           e.ID_TIPO_DOCUMENTO, e.NRO_DOCUMENTO, e.DIRECCION, e.ID_PAIS, e.ID_CIUDAD
      FROM USUARIO u
      JOIN MAESTRO_MAESTRO eu ON eu.ID_MAESTRO = u.ID_ESTADO_USUARIO
      LEFT JOIN USUARIO_ROL ur ON ur.ID_USUARIO = u.ID_USUARIO AND ur.ES_PRINCIPAL = 1 AND ur.ID_ESTADO = v_id_activo
      LEFT JOIN ROL r ON r.ID_ROL = ur.ID_ROL
      LEFT JOIN AREA ar ON ar.ID_AREA = r.ID_AREA
      LEFT JOIN RRHH_EMPLEADO e ON e.ID_USUARIO = u.ID_USUARIO
     WHERE eu.CODIGO = 'ACTIVO'
       AND (p_id_area IS NULL OR ar.ID_AREA = p_id_area)
       AND (
            p_busqueda IS NULL OR p_busqueda = '' OR
            u.NOMBRES LIKE CONCAT('%', p_busqueda, '%') OR
            u.APELLIDOS LIKE CONCAT('%', p_busqueda, '%') OR
            r.NOMBRE LIKE CONCAT('%', p_busqueda, '%')
       )
     ORDER BY u.APELLIDOS, u.NOMBRES;
END$$

-- PUESTO = ROL_NOMBRE (rol principal, mismo criterio que LISTAR).
-- FECHA_INGRESO = fecha de inicio del contrato mas antiguo de la
-- persona (planilla o locador, el que sea) -- ya no se tipea a mano.
CREATE PROCEDURE SP_RRHH_EMPLEADO_OBTENER(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    SELECT u.ID_USUARIO, u.USUARIO, u.NOMBRES, u.APELLIDOS, u.CORREO,
           ar.ID_AREA, ar.NOMBRE AS AREA_NOMBRE, r.NOMBRE AS ROL_NOMBRE,
           r.NOMBRE AS PUESTO, e.TELEFONO, e.EXTENSION,
           (SELECT MIN(c.FECHA_INICIO) FROM RRHH_CONTRATO c WHERE c.ID_USUARIO = u.ID_USUARIO) AS FECHA_INGRESO,
           e.FOTO_URL,
           e.ID_TIPO_DOCUMENTO, td.CODIGO AS TIPO_DOCUMENTO_CODIGO, td.DESCRIPCION AS TIPO_DOCUMENTO_DESCRIPCION,
           e.NRO_DOCUMENTO, e.DIRECCION,
           e.ID_PAIS, pa.DESCRIPCION AS PAIS_DESCRIPCION,
           e.ID_CIUDAD, ci.DESCRIPCION AS CIUDAD_DESCRIPCION,
           e.CORREO_CLOCKIFY
      FROM USUARIO u
      LEFT JOIN USUARIO_ROL ur ON ur.ID_USUARIO = u.ID_USUARIO AND ur.ES_PRINCIPAL = 1
      LEFT JOIN ROL r ON r.ID_ROL = ur.ID_ROL
      LEFT JOIN AREA ar ON ar.ID_AREA = r.ID_AREA
      LEFT JOIN RRHH_EMPLEADO e ON e.ID_USUARIO = u.ID_USUARIO
      LEFT JOIN MAESTRO_MAESTRO td ON td.ID_MAESTRO = e.ID_TIPO_DOCUMENTO
      LEFT JOIN MAESTRO_MAESTRO pa ON pa.ID_MAESTRO = e.ID_PAIS
      LEFT JOIN MAESTRO_MAESTRO ci ON ci.ID_MAESTRO = e.ID_CIUDAD
     WHERE u.ID_USUARIO = p_id_usuario;
END$$

CREATE PROCEDURE SP_RRHH_EMPLEADO_UPSERT(
    IN p_id_usuario INT UNSIGNED,
    IN p_telefono VARCHAR(30),
    IN p_extension VARCHAR(10),
    IN p_foto_url VARCHAR(300),
    IN p_id_tipo_documento INT UNSIGNED,
    IN p_nro_documento VARCHAR(20),
    IN p_direccion VARCHAR(200),
    IN p_id_pais INT UNSIGNED,
    IN p_id_ciudad INT UNSIGNED,
    IN p_correo_clockify VARCHAR(150),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO RRHH_EMPLEADO (
        ID_USUARIO, TELEFONO, EXTENSION, FOTO_URL,
        ID_TIPO_DOCUMENTO, NRO_DOCUMENTO, DIRECCION, ID_PAIS, ID_CIUDAD, CORREO_CLOCKIFY,
        ID_ESTADO, USUARIO_MODIFICACION
    )
    VALUES (
        p_id_usuario, p_telefono, p_extension, p_foto_url,
        p_id_tipo_documento, p_nro_documento, p_direccion, p_id_pais, p_id_ciudad, p_correo_clockify,
        v_id_activo, p_id_usuario_modificacion
    )
    ON DUPLICATE KEY UPDATE
        TELEFONO = p_telefono,
        EXTENSION = p_extension,
        FOTO_URL = p_foto_url,
        ID_TIPO_DOCUMENTO = p_id_tipo_documento,
        NRO_DOCUMENTO = p_nro_documento,
        DIRECCION = p_direccion,
        ID_PAIS = p_id_pais,
        ID_CIUDAD = p_id_ciudad,
        CORREO_CLOCKIFY = p_correo_clockify,
        USUARIO_MODIFICACION = p_id_usuario_modificacion;
END$$

DELIMITER ;
