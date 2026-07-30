-- =====================================================================
-- Configuracion general de la empresa (hoy solo el logo). Fila singleton
-- ID_CONFIGURACION=1, ver db/seed/015_configuracion_empresa.sql.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_CONFIGURACION_EMPRESA_OBTENER;
DROP PROCEDURE IF EXISTS SP_CONFIGURACION_EMPRESA_LOGO_ACTUALIZAR;

DELIMITER $$

CREATE PROCEDURE SP_CONFIGURACION_EMPRESA_OBTENER()
BEGIN
    SELECT ID_CONFIGURACION, LOGO_URL, LOGO_FORMATO
      FROM CONFIGURACION_EMPRESA
     WHERE ID_CONFIGURACION = 1;
END$$

CREATE PROCEDURE SP_CONFIGURACION_EMPRESA_LOGO_ACTUALIZAR(
    IN p_logo_url VARCHAR(300),
    IN p_logo_formato VARCHAR(4),
    IN p_id_usuario_modificacion INT UNSIGNED
)
BEGIN
    UPDATE CONFIGURACION_EMPRESA
       SET LOGO_URL = p_logo_url,
           LOGO_FORMATO = p_logo_formato,
           USUARIO_MODIFICACION = p_id_usuario_modificacion
     WHERE ID_CONFIGURACION = 1;
END$$

DELIMITER ;
