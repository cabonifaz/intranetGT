-- =====================================================================
-- Tipo de cambio (TC) por categoria de negocio -- ver
-- 032_tipo_cambio_categorias.sql para el modelo de datos. "Vigente" es
-- la fila mas reciente de TIPO_CAMBIO_HISTORICO por categoria; fijar un
-- TC nuevo es agregar una fila (nunca se actualiza una existente), asi
-- el historico queda completo solo. TIPO_CAMBIO_SUNAT_DIA es la cache
-- del TC oficial SUNAT compra/venta del dia -- alimenta las 4 categorias
-- con el TC Venta, tanto automaticamente (una vez al dia, ver
-- asegurarTipoCambioDelDia en src/lib/facturacion/tipo-cambio-sunat.ts)
-- como a demanda desde el boton "Actualizar TC ahora" de la pantalla.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_TIPO_CAMBIO_LISTAR_CATEGORIAS;
DROP PROCEDURE IF EXISTS SP_TIPO_CAMBIO_FIJAR;
DROP PROCEDURE IF EXISTS SP_TIPO_CAMBIO_HISTORICO_LISTAR;
DROP PROCEDURE IF EXISTS SP_TIPO_CAMBIO_SUNAT_OBTENER_DIA;
DROP PROCEDURE IF EXISTS SP_TIPO_CAMBIO_SUNAT_GUARDAR_DIA;
DROP PROCEDURE IF EXISTS SP_TIPO_CAMBIO_SUNAT_ACTUALIZAR_DIA;

DELIMITER $$

-- Una fila por categoria (LABORAL/PRESTAMO/COMPRA/VENTA) con su VALOR
-- vigente y desde cuando aplica -- NULL si esa categoria nunca se fijo.
CREATE PROCEDURE SP_TIPO_CAMBIO_LISTAR_CATEGORIAS()
BEGIN
    SELECT cat.ID_MAESTRO AS ID_CATEGORIA_TC, cat.CODIGO, cat.DESCRIPCION,
           th.VALOR, th.FECHA_CREACION AS VIGENTE_DESDE
      FROM MAESTRO_MAESTRO cat
      LEFT JOIN TIPO_CAMBIO_HISTORICO th ON th.ID_TIPO_CAMBIO = (
          SELECT th2.ID_TIPO_CAMBIO FROM TIPO_CAMBIO_HISTORICO th2
           WHERE th2.ID_CATEGORIA_TC = cat.ID_MAESTRO
           ORDER BY th2.FECHA_CREACION DESC, th2.ID_TIPO_CAMBIO DESC
           LIMIT 1
      )
     WHERE cat.TIPO_MAESTRO = 'CATEGORIA_TIPO_CAMBIO'
     ORDER BY cat.ORDEN;
END$$

-- Fijar un TC nuevo para una categoria es agregar una fila al historico
-- -- nunca se actualiza/borra lo que ya existia, por eso no hay
-- SP_TIPO_CAMBIO_ACTUALIZAR ni ELIMINAR.
CREATE PROCEDURE SP_TIPO_CAMBIO_FIJAR(
    IN p_id_categoria_tc INT UNSIGNED,
    IN p_valor DECIMAL(10,4),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_tipo_cambio INT UNSIGNED
)
BEGIN
    INSERT INTO TIPO_CAMBIO_HISTORICO (ID_CATEGORIA_TC, VALOR, USUARIO_CREACION)
    VALUES (p_id_categoria_tc, p_valor, p_id_usuario_creacion);

    SET p_id_tipo_cambio = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_TIPO_CAMBIO_HISTORICO_LISTAR(
    IN p_id_categoria_tc INT UNSIGNED
)
BEGIN
    SELECT th.ID_TIPO_CAMBIO, th.ID_CATEGORIA_TC, th.VALOR, th.FECHA_CREACION,
           u.NOMBRES AS USUARIO_NOMBRES, u.APELLIDOS AS USUARIO_APELLIDOS
      FROM TIPO_CAMBIO_HISTORICO th
      LEFT JOIN USUARIO u ON u.ID_USUARIO = th.USUARIO_CREACION
     WHERE th.ID_CATEGORIA_TC = p_id_categoria_tc
     ORDER BY th.FECHA_CREACION DESC, th.ID_TIPO_CAMBIO DESC;
END$$

-- Vacio (0 filas) si todavia no se consulto la API SUNAT para esa fecha
-- -- la app lo usa para decidir si hace falta llamarla.
CREATE PROCEDURE SP_TIPO_CAMBIO_SUNAT_OBTENER_DIA(
    IN p_fecha DATE
)
BEGIN
    SELECT FECHA, TC_COMPRA, TC_VENTA FROM TIPO_CAMBIO_SUNAT_DIA WHERE FECHA = p_fecha;
END$$

-- No-op silencioso si esa fecha ya se guardo antes -- evita duplicados
-- si dos requests dispararan el fetch casi al mismo tiempo (FECHA es PK,
-- pero se valida con NOT EXISTS en vez de dejar que falle el INSERT,
-- mismo estilo del resto del sistema).
CREATE PROCEDURE SP_TIPO_CAMBIO_SUNAT_GUARDAR_DIA(
    IN p_fecha DATE,
    IN p_tc_compra DECIMAL(10,4),
    IN p_tc_venta DECIMAL(10,4)
)
BEGIN
    INSERT INTO TIPO_CAMBIO_SUNAT_DIA (FECHA, TC_COMPRA, TC_VENTA)
    SELECT p_fecha, p_tc_compra, p_tc_venta
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_CAMBIO_SUNAT_DIA WHERE FECHA = p_fecha);
END$$

-- A diferencia de SP_TIPO_CAMBIO_SUNAT_GUARDAR_DIA (no-op si la fecha ya
-- existe, usado por el sync automatico de una vez al dia), este SI
-- sobreescribe la fila de hoy si ya existia -- es lo que usa el boton
-- "Actualizar TC ahora" para forzar una relectura de la API aunque el
-- sync automatico ya haya corrido.
CREATE PROCEDURE SP_TIPO_CAMBIO_SUNAT_ACTUALIZAR_DIA(
    IN p_fecha DATE,
    IN p_tc_compra DECIMAL(10,4),
    IN p_tc_venta DECIMAL(10,4)
)
BEGIN
    INSERT INTO TIPO_CAMBIO_SUNAT_DIA (FECHA, TC_COMPRA, TC_VENTA)
    VALUES (p_fecha, p_tc_compra, p_tc_venta)
    ON DUPLICATE KEY UPDATE TC_COMPRA = p_tc_compra, TC_VENTA = p_tc_venta;
END$$

DELIMITER ;
