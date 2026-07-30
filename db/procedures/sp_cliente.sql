-- =====================================================================
-- Procedimientos del catalogo de clientes -- calco exacto de SP_PROVEEDOR_*
-- (db/procedures/sp_compra.sql), usado por el modulo de Proyectos.
--
-- Los contactos de un cliente ya no viven aqui -- se generalizaron a
-- DIRECTORIO_CONTACTO_EXTERNO (ver db/procedures/sp_directorio_contacto.sql),
-- compartido con Proveedores y Socios comerciales. Los DROP de abajo
-- limpian los procedimientos SP_CLIENTE_CONTACTO_* de la version anterior.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_CLIENTE_CREAR;
DROP PROCEDURE IF EXISTS SP_CLIENTE_LISTAR;
DROP PROCEDURE IF EXISTS SP_CLIENTE_OBTENER;
DROP PROCEDURE IF EXISTS SP_CLIENTE_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_CLIENTE_CAMBIAR_ESTADO;
DROP PROCEDURE IF EXISTS SP_CLIENTE_CONTACTO_CREAR;
DROP PROCEDURE IF EXISTS SP_CLIENTE_CONTACTO_LISTAR;
DROP PROCEDURE IF EXISTS SP_CLIENTE_CONTACTO_LISTAR_TODOS;
DROP PROCEDURE IF EXISTS SP_CLIENTE_CONTACTO_OBTENER;
DROP PROCEDURE IF EXISTS SP_CLIENTE_CONTACTO_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_CLIENTE_CONTACTO_CAMBIAR_ESTADO;

DELIMITER $$

CREATE PROCEDURE SP_CLIENTE_CREAR(
    IN p_ruc VARCHAR(11),
    IN p_razon_social VARCHAR(150),
    IN p_nombre_contacto VARCHAR(100),
    IN p_telefono VARCHAR(20),
    IN p_correo VARCHAR(100),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_cliente INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO CLIENTE (
        RUC, RAZON_SOCIAL, NOMBRE_CONTACTO, TELEFONO, CORREO, ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_ruc, p_razon_social, p_nombre_contacto, p_telefono, p_correo, v_id_activo, p_id_usuario_creacion
    );

    SET p_id_cliente = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_CLIENTE_LISTAR(
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT c.ID_CLIENTE, c.RUC, c.RAZON_SOCIAL, c.NOMBRE_CONTACTO, c.TELEFONO, c.CORREO,
           c.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM CLIENTE c
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = c.ID_ESTADO
     WHERE (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY c.RAZON_SOCIAL;
END$$

CREATE PROCEDURE SP_CLIENTE_OBTENER(
    IN p_id_cliente INT UNSIGNED
)
BEGIN
    SELECT c.ID_CLIENTE, c.RUC, c.RAZON_SOCIAL, c.NOMBRE_CONTACTO, c.TELEFONO, c.CORREO,
           c.ID_ESTADO, e.CODIGO AS ESTADO_CODIGO
      FROM CLIENTE c
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = c.ID_ESTADO
     WHERE c.ID_CLIENTE = p_id_cliente;
END$$

CREATE PROCEDURE SP_CLIENTE_ACTUALIZAR(
    IN p_id_cliente INT UNSIGNED,
    IN p_ruc VARCHAR(11),
    IN p_razon_social VARCHAR(150),
    IN p_nombre_contacto VARCHAR(100),
    IN p_telefono VARCHAR(20),
    IN p_correo VARCHAR(100),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE CLIENTE
       SET RUC = p_ruc,
           RAZON_SOCIAL = p_razon_social,
           NOMBRE_CONTACTO = p_nombre_contacto,
           TELEFONO = p_telefono,
           CORREO = p_correo,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_CLIENTE = p_id_cliente;
END$$

CREATE PROCEDURE SP_CLIENTE_CAMBIAR_ESTADO(
    IN p_id_cliente INT UNSIGNED,
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

    UPDATE CLIENTE
       SET ID_ESTADO = v_id_estado,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_CLIENTE = p_id_cliente;
END$$

DELIMITER ;
