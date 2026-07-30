-- =====================================================================
-- Procedimientos de contactos externos del directorio (DIRECTORIO_CONTACTO_EXTERNO).
-- Un solo modelo para contactos de Cliente, de Proveedor, y de Socio
-- comercial/Otro (sin tabla de entidad propia, solo EMPRESA_EXTERNA como
-- texto libre) -- evita triplicar la misma tabla por cada tipo.
--
-- ID_TIPO_RELACION, y la entidad enlazada (ID_CLIENTE/ID_PROVEEDOR/
-- EMPRESA_EXTERNA) son inmutables una vez creado el contacto -- mismo
-- criterio que el tipo/banco/moneda de CUENTA_EMPRESA.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_DIRECTORIO_CONTACTO_CREAR;
DROP PROCEDURE IF EXISTS SP_DIRECTORIO_CONTACTO_LISTAR_POR_CLIENTE;
DROP PROCEDURE IF EXISTS SP_DIRECTORIO_CONTACTO_LISTAR_POR_PROVEEDOR;
DROP PROCEDURE IF EXISTS SP_DIRECTORIO_CONTACTO_LISTAR_TODOS;
DROP PROCEDURE IF EXISTS SP_DIRECTORIO_CONTACTO_OBTENER;
DROP PROCEDURE IF EXISTS SP_DIRECTORIO_CONTACTO_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_DIRECTORIO_CONTACTO_CAMBIAR_ESTADO;

DELIMITER $$

-- Segun el CODIGO de p_id_tipo_relacion, fuerza a NULL los campos que no
-- correspondan (guard contra inconsistencia, no solo confiar en la app):
-- CLIENTE -> solo ID_CLIENTE; PROVEEDOR -> solo ID_PROVEEDOR;
-- SOCIO_COMERCIAL/OTRO -> solo EMPRESA_EXTERNA.
CREATE PROCEDURE SP_DIRECTORIO_CONTACTO_CREAR(
    IN p_id_tipo_relacion INT UNSIGNED,
    IN p_id_cliente INT UNSIGNED,
    IN p_id_proveedor INT UNSIGNED,
    IN p_empresa_externa VARCHAR(150),
    IN p_nombres VARCHAR(100),
    IN p_apellidos VARCHAR(100),
    IN p_area VARCHAR(100),
    IN p_cargo VARCHAR(100),
    IN p_tema_interes VARCHAR(300),
    IN p_relacion_gt VARCHAR(200),
    IN p_telefono VARCHAR(30),
    IN p_correo VARCHAR(150),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_contacto INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_codigo_tipo VARCHAR(50);
    DECLARE v_id_cliente INT UNSIGNED;
    DECLARE v_id_proveedor INT UNSIGNED;
    DECLARE v_empresa_externa VARCHAR(150);

    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);
    SET v_codigo_tipo = (SELECT CODIGO FROM MAESTRO_MAESTRO WHERE ID_MAESTRO = p_id_tipo_relacion LIMIT 1);

    SET v_id_cliente = IF(v_codigo_tipo = 'CLIENTE', p_id_cliente, NULL);
    SET v_id_proveedor = IF(v_codigo_tipo = 'PROVEEDOR', p_id_proveedor, NULL);
    SET v_empresa_externa = IF(v_codigo_tipo IN ('SOCIO_COMERCIAL', 'OTRO'), p_empresa_externa, NULL);

    INSERT INTO DIRECTORIO_CONTACTO_EXTERNO (
        ID_TIPO_RELACION, ID_CLIENTE, ID_PROVEEDOR, EMPRESA_EXTERNA,
        NOMBRES, APELLIDOS, AREA, CARGO, TEMA_INTERES, RELACION_GT, TELEFONO, CORREO,
        ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_id_tipo_relacion, v_id_cliente, v_id_proveedor, v_empresa_externa,
        p_nombres, p_apellidos, p_area, p_cargo, p_tema_interes, p_relacion_gt, p_telefono, p_correo,
        v_id_activo, p_id_usuario_creacion
    );

    SET p_id_contacto = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_DIRECTORIO_CONTACTO_LISTAR_POR_CLIENTE(
    IN p_id_cliente INT UNSIGNED
)
BEGIN
    SELECT co.ID_CONTACTO, co.NOMBRES, co.APELLIDOS, co.AREA, co.CARGO,
           co.TEMA_INTERES, co.RELACION_GT, co.TELEFONO, co.CORREO,
           co.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM DIRECTORIO_CONTACTO_EXTERNO co
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = co.ID_ESTADO
     WHERE co.ID_CLIENTE = p_id_cliente AND e.CODIGO = 'ACTIVO'
     ORDER BY co.APELLIDOS, co.NOMBRES;
END$$

CREATE PROCEDURE SP_DIRECTORIO_CONTACTO_LISTAR_POR_PROVEEDOR(
    IN p_id_proveedor INT UNSIGNED
)
BEGIN
    SELECT co.ID_CONTACTO, co.NOMBRES, co.APELLIDOS, co.AREA, co.CARGO,
           co.TEMA_INTERES, co.RELACION_GT, co.TELEFONO, co.CORREO,
           co.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM DIRECTORIO_CONTACTO_EXTERNO co
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = co.ID_ESTADO
     WHERE co.ID_PROVEEDOR = p_id_proveedor AND e.CODIGO = 'ACTIVO'
     ORDER BY co.APELLIDOS, co.NOMBRES;
END$$

-- Alimenta la pestaña "Contactos externos" del Directorio Corporativo
-- (/rrhh/directorio) -- mismo patron de busqueda libre que
-- SP_RRHH_EMPLEADO_LISTAR, pero sin pasar nunca por USUARIO.
-- EMPRESA_NOMBRE resuelve la razon social real (Cliente/Proveedor) o el
-- texto libre (Socio comercial/Otro), lo que aplique.
CREATE PROCEDURE SP_DIRECTORIO_CONTACTO_LISTAR_TODOS(
    IN p_busqueda VARCHAR(100),
    IN p_id_tipo_relacion INT UNSIGNED
)
BEGIN
    SELECT co.ID_CONTACTO, co.NOMBRES, co.APELLIDOS, co.AREA, co.CARGO, co.TEMA_INTERES, co.RELACION_GT,
           co.TELEFONO, co.CORREO, co.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO,
           co.ID_TIPO_RELACION, tr.CODIGO AS TIPO_RELACION_CODIGO, tr.DESCRIPCION AS TIPO_RELACION_DESCRIPCION,
           COALESCE(cl.RAZON_SOCIAL, pr.RAZON_SOCIAL, co.EMPRESA_EXTERNA) AS EMPRESA_NOMBRE
      FROM DIRECTORIO_CONTACTO_EXTERNO co
      JOIN MAESTRO_MAESTRO tr ON tr.ID_MAESTRO = co.ID_TIPO_RELACION
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = co.ID_ESTADO
      LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = co.ID_CLIENTE
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = co.ID_PROVEEDOR
     WHERE e.CODIGO = 'ACTIVO'
       AND (p_id_tipo_relacion IS NULL OR co.ID_TIPO_RELACION = p_id_tipo_relacion)
       AND (
            p_busqueda IS NULL OR p_busqueda = '' OR
            co.NOMBRES LIKE CONCAT('%', p_busqueda, '%') OR
            co.APELLIDOS LIKE CONCAT('%', p_busqueda, '%') OR
            co.CARGO LIKE CONCAT('%', p_busqueda, '%') OR
            co.AREA LIKE CONCAT('%', p_busqueda, '%') OR
            cl.RAZON_SOCIAL LIKE CONCAT('%', p_busqueda, '%') OR
            pr.RAZON_SOCIAL LIKE CONCAT('%', p_busqueda, '%') OR
            co.EMPRESA_EXTERNA LIKE CONCAT('%', p_busqueda, '%')
       )
     ORDER BY co.APELLIDOS, co.NOMBRES;
END$$

CREATE PROCEDURE SP_DIRECTORIO_CONTACTO_OBTENER(
    IN p_id_contacto INT UNSIGNED
)
BEGIN
    SELECT co.ID_CONTACTO, co.NOMBRES, co.APELLIDOS, co.AREA, co.CARGO, co.TEMA_INTERES, co.RELACION_GT,
           co.TELEFONO, co.CORREO, co.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO,
           co.ID_TIPO_RELACION, tr.CODIGO AS TIPO_RELACION_CODIGO, tr.DESCRIPCION AS TIPO_RELACION_DESCRIPCION,
           co.ID_CLIENTE, co.ID_PROVEEDOR,
           COALESCE(cl.RAZON_SOCIAL, pr.RAZON_SOCIAL, co.EMPRESA_EXTERNA) AS EMPRESA_NOMBRE
      FROM DIRECTORIO_CONTACTO_EXTERNO co
      JOIN MAESTRO_MAESTRO tr ON tr.ID_MAESTRO = co.ID_TIPO_RELACION
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = co.ID_ESTADO
      LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = co.ID_CLIENTE
      LEFT JOIN PROVEEDOR pr ON pr.ID_PROVEEDOR = co.ID_PROVEEDOR
     WHERE co.ID_CONTACTO = p_id_contacto;
END$$

CREATE PROCEDURE SP_DIRECTORIO_CONTACTO_ACTUALIZAR(
    IN p_id_contacto INT UNSIGNED,
    IN p_nombres VARCHAR(100),
    IN p_apellidos VARCHAR(100),
    IN p_area VARCHAR(100),
    IN p_cargo VARCHAR(100),
    IN p_tema_interes VARCHAR(300),
    IN p_relacion_gt VARCHAR(200),
    IN p_telefono VARCHAR(30),
    IN p_correo VARCHAR(150),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE DIRECTORIO_CONTACTO_EXTERNO
       SET NOMBRES = p_nombres,
           APELLIDOS = p_apellidos,
           AREA = p_area,
           CARGO = p_cargo,
           TEMA_INTERES = p_tema_interes,
           RELACION_GT = p_relacion_gt,
           TELEFONO = p_telefono,
           CORREO = p_correo,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_CONTACTO = p_id_contacto;
END$$

CREATE PROCEDURE SP_DIRECTORIO_CONTACTO_CAMBIAR_ESTADO(
    IN p_id_contacto INT UNSIGNED,
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

    UPDATE DIRECTORIO_CONTACTO_EXTERNO
       SET ID_ESTADO = v_id_estado,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_CONTACTO = p_id_contacto;
END$$

DELIMITER ;
