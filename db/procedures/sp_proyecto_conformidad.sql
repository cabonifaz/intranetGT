-- =====================================================================
-- Conformidad de cliente por hito de facturacion (ver 050_proyecto_conformidad.sql,
-- 054_proyecto_conformidad_firmante.sql). 1 conformidad = 1 hito, pero
-- una conformidad puede tener VARIOS firmantes (PROYECTO_CONFORMIDAD_FIRMANTE,
-- cada uno con su propio nombre/cargo y su propio link de firma). La
-- conformidad pasa a FIRMADA solo cuando TODOS sus firmantes ya firmaron
-- -- ver SP_PROYECTO_CONFORMIDAD_RECALCULAR_ESTADO, que es la unica
-- fuente de verdad de esa transicion (se llama despues de cualquier
-- firma o eliminacion de firmante). Estados BORRADOR -> EMITIDA ->
-- FIRMADA, + ANULADA. Mismo mecanismo de firma con token que
-- SP_RRHH_PRESTAMO_* (sp_rrhh_prestamo.sql) -- columnas de token en la
-- propia tabla (ahora en PROYECTO_CONFORMIDAD_FIRMANTE, no en
-- PROYECTO_CONFORMIDAD), token de un solo uso (se limpia al firmar).
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_CREAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_OBTENER;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_OBTENER_POR_HITO;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_OBTENER_POR_TOKEN;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_LISTAR_POR_PROYECTO;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_ITEM_AGREGAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_ITEM_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_ITEM_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_ITEM_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_EMITIR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_REABRIR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_GENERAR_LINK;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_REGISTRAR_FIRMA;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_ANULAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_RECALCULAR_ESTADO;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_AGREGAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_OBTENER;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_LISTAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_GENERAR_LINK;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_OBTENER_POR_TOKEN;
DROP PROCEDURE IF EXISTS SP_PROYECTO_CONFORMIDAD_FIRMANTE_REGISTRAR_FIRMA;

DELIMITER $$

-- Idempotente: si el hito ya tiene una conformidad, devuelve su ID sin
-- crear otra (evita duplicar con un doble clic en "Generar conformidad").
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_CREAR(
    IN p_id_hito INT UNSIGNED,
    IN p_titulo VARCHAR(150),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_conformidad INT UNSIGNED
)
BEGIN
    DECLARE v_id_borrador INT UNSIGNED;
    DECLARE v_id_proyecto INT UNSIGNED;
    DECLARE v_existente INT UNSIGNED;

    SET v_existente = (SELECT ID_CONFORMIDAD FROM PROYECTO_CONFORMIDAD WHERE ID_HITO = p_id_hito LIMIT 1);

    IF v_existente IS NOT NULL THEN
        SET p_id_conformidad = v_existente;
    ELSE
        SET v_id_borrador = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONFORMIDAD' AND CODIGO = 'BORRADOR' LIMIT 1);
        SET v_id_proyecto = (SELECT ID_PROYECTO FROM PROYECTO_HITO WHERE ID_HITO = p_id_hito LIMIT 1);

        INSERT INTO PROYECTO_CONFORMIDAD (ID_HITO, ID_PROYECTO, TITULO, ID_ESTADO_CONFORMIDAD, USUARIO_CREACION)
        VALUES (p_id_hito, v_id_proyecto, p_titulo, v_id_borrador, p_id_usuario_creacion);

        SET p_id_conformidad = LAST_INSERT_ID();
    END IF;
END$$

CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_OBTENER(
    IN p_id_conformidad INT UNSIGNED
)
BEGIN
    SELECT c.ID_CONFORMIDAD, c.ID_HITO, c.ID_PROYECTO, c.TITULO,
           c.ID_ESTADO_CONFORMIDAD, ec.CODIGO AS ESTADO_CONFORMIDAD_CODIGO, ec.DESCRIPCION AS ESTADO_CONFORMIDAD_DESCRIPCION,
           c.DOCUMENTO_PATH, c.DOCUMENTO_FIRMADO_PATH,
           c.FECHA_EMISION, c.FECHA_FIRMA, c.MOTIVO_ANULACION, c.FECHA_ANULACION,
           h.NOMBRE AS HITO_NOMBRE, h.MONTO AS HITO_MONTO,
           py.NOMBRE AS PROYECTO_NOMBRE, py.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO,
           py.ID_CLIENTE, cl.RAZON_SOCIAL AS CLIENTE_RAZON_SOCIAL, cl.RUC AS CLIENTE_RUC,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_ITEM i WHERE i.ID_CONFORMIDAD = c.ID_CONFORMIDAD) AS TOTAL_ITEMS,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_FIRMANTE f WHERE f.ID_CONFORMIDAD = c.ID_CONFORMIDAD) AS TOTAL_FIRMANTES,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_FIRMANTE f WHERE f.ID_CONFORMIDAD = c.ID_CONFORMIDAD AND f.FECHA_FIRMA IS NOT NULL) AS FIRMANTES_FIRMADOS
      FROM PROYECTO_CONFORMIDAD c
      JOIN PROYECTO_HITO h ON h.ID_HITO = c.ID_HITO
      JOIN PROYECTO py ON py.ID_PROYECTO = c.ID_PROYECTO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = py.ID_MONEDA
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
      LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = py.ID_CLIENTE
     WHERE c.ID_CONFORMIDAD = p_id_conformidad;
END$$

CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_OBTENER_POR_HITO(
    IN p_id_hito INT UNSIGNED
)
BEGIN
    SELECT c.ID_CONFORMIDAD, c.ID_HITO, c.ID_PROYECTO, c.TITULO,
           c.ID_ESTADO_CONFORMIDAD, ec.CODIGO AS ESTADO_CONFORMIDAD_CODIGO, ec.DESCRIPCION AS ESTADO_CONFORMIDAD_DESCRIPCION,
           c.DOCUMENTO_PATH, c.DOCUMENTO_FIRMADO_PATH,
           c.FECHA_EMISION, c.FECHA_FIRMA, c.MOTIVO_ANULACION, c.FECHA_ANULACION,
           h.NOMBRE AS HITO_NOMBRE, h.MONTO AS HITO_MONTO,
           py.NOMBRE AS PROYECTO_NOMBRE, py.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO,
           py.ID_CLIENTE, cl.RAZON_SOCIAL AS CLIENTE_RAZON_SOCIAL, cl.RUC AS CLIENTE_RUC,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_ITEM i WHERE i.ID_CONFORMIDAD = c.ID_CONFORMIDAD) AS TOTAL_ITEMS,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_FIRMANTE f WHERE f.ID_CONFORMIDAD = c.ID_CONFORMIDAD) AS TOTAL_FIRMANTES,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_FIRMANTE f WHERE f.ID_CONFORMIDAD = c.ID_CONFORMIDAD AND f.FECHA_FIRMA IS NOT NULL) AS FIRMANTES_FIRMADOS
      FROM PROYECTO_CONFORMIDAD c
      JOIN PROYECTO_HITO h ON h.ID_HITO = c.ID_HITO
      JOIN PROYECTO py ON py.ID_PROYECTO = c.ID_PROYECTO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = py.ID_MONEDA
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
      LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = py.ID_CLIENTE
     WHERE c.ID_HITO = p_id_hito;
END$$

-- Para la matriz de cumplimiento del proyecto: una fila por cada hito
-- (LEFT JOIN -- puede no tener conformidad todavia). Excluye los
-- ADELANTO: se cobran antes de cualquier entregable, no hay nada que el
-- cliente pueda dar por recibido todavia, asi que nunca necesitan
-- conformidad (mismo criterio en SP_PROYECTO_HITO_MARCAR_FACTURADO).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_LISTAR_POR_PROYECTO(
    IN p_id_proyecto INT UNSIGNED
)
BEGIN
    SELECT h.ID_HITO, h.NOMBRE AS HITO_NOMBRE, h.ORDEN,
           c.ID_CONFORMIDAD, c.ID_ESTADO_CONFORMIDAD, ec.CODIGO AS ESTADO_CONFORMIDAD_CODIGO,
           c.FECHA_EMISION, c.FECHA_FIRMA,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_ITEM i WHERE i.ID_CONFORMIDAD = c.ID_CONFORMIDAD) AS TOTAL_ITEMS,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_FIRMANTE f WHERE f.ID_CONFORMIDAD = c.ID_CONFORMIDAD) AS TOTAL_FIRMANTES,
           (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_FIRMANTE f WHERE f.ID_CONFORMIDAD = c.ID_CONFORMIDAD AND f.FECHA_FIRMA IS NOT NULL) AS FIRMANTES_FIRMADOS
      FROM PROYECTO_HITO h
      JOIN MAESTRO_MAESTRO th ON th.ID_MAESTRO = h.ID_TIPO_HITO
      LEFT JOIN PROYECTO_CONFORMIDAD c ON c.ID_HITO = h.ID_HITO
      LEFT JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
     WHERE h.ID_PROYECTO = p_id_proyecto AND th.CODIGO != 'ADELANTO'
     ORDER BY h.ORDEN, h.ID_HITO;
END$$

-- Guard: solo se pueden agregar/editar/eliminar items mientras la
-- conformidad sigue BORRADOR -- una vez EMITIDA quedan congelados (el
-- PDF ya se generó con ese contenido).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_ITEM_AGREGAR(
    IN p_id_conformidad INT UNSIGNED,
    IN p_descripcion VARCHAR(300),
    IN p_orden INT,
    OUT p_id_item INT UNSIGNED
)
BEGIN
    DECLARE v_en_borrador INT;
    SELECT COUNT(*) INTO v_en_borrador
      FROM PROYECTO_CONFORMIDAD c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
     WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO = 'BORRADOR';

    IF v_en_borrador = 1 THEN
        INSERT INTO PROYECTO_CONFORMIDAD_ITEM (ID_CONFORMIDAD, DESCRIPCION, ORDEN) VALUES (p_id_conformidad, p_descripcion, p_orden);
        SET p_id_item = LAST_INSERT_ID();
    ELSE
        SET p_id_item = NULL;
    END IF;
END$$

CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_ITEM_LISTAR(
    IN p_id_conformidad INT UNSIGNED
)
BEGIN
    SELECT ID_ITEM, ID_CONFORMIDAD, ORDEN, DESCRIPCION
      FROM PROYECTO_CONFORMIDAD_ITEM
     WHERE ID_CONFORMIDAD = p_id_conformidad
     ORDER BY ORDEN, ID_ITEM;
END$$

CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_ITEM_ACTUALIZAR(
    IN p_id_item INT UNSIGNED,
    IN p_descripcion VARCHAR(300)
)
BEGIN
    UPDATE PROYECTO_CONFORMIDAD_ITEM i
      JOIN PROYECTO_CONFORMIDAD c ON c.ID_CONFORMIDAD = i.ID_CONFORMIDAD
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
       SET i.DESCRIPCION = p_descripcion
     WHERE i.ID_ITEM = p_id_item AND ec.CODIGO = 'BORRADOR';
END$$

CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_ITEM_ELIMINAR(
    IN p_id_item INT UNSIGNED
)
BEGIN
    DELETE i FROM PROYECTO_CONFORMIDAD_ITEM i
      JOIN PROYECTO_CONFORMIDAD c ON c.ID_CONFORMIDAD = i.ID_CONFORMIDAD
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
     WHERE i.ID_ITEM = p_id_item AND ec.CODIGO = 'BORRADOR';
END$$

-- La app ya genero y guardo el PDF (sin firma) antes de llamar esto --
-- mismo orden que el resto del sistema (primero el archivo, despues
-- persistir la ruta). Guard: solo si BORRADOR (la regla de "al menos 1
-- item" la exige la action antes de llegar aca, no este SP). Los
-- firmantes se agregan DESPUES de emitir (ver SP_..._FIRMANTE_AGREGAR).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_EMITIR(
    IN p_id_conformidad INT UNSIGNED,
    IN p_documento_path VARCHAR(300)
)
BEGIN
    DECLARE v_id_emitida INT UNSIGNED;
    SET v_id_emitida = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONFORMIDAD' AND CODIGO = 'EMITIDA' LIMIT 1);

    UPDATE PROYECTO_CONFORMIDAD c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
       SET c.ID_ESTADO_CONFORMIDAD = v_id_emitida, c.DOCUMENTO_PATH = p_documento_path, c.FECHA_EMISION = NOW()
     WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO = 'BORRADOR';
END$$

-- Permite corregir items antes de firmar -- guard: solo si EMITIDA Y
-- ningun firmante firmo todavia (si alguno ya firmo, ese documento no se
-- puede reabrir -- su firma quedaria sobre un contenido que ya no
-- existe). Al reabrir se borran los firmantes (nadie firmo nada aun) y
-- el documento generado -- el gestor los vuelve a agregar al re-emitir.
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_REABRIR(
    IN p_id_conformidad INT UNSIGNED
)
BEGIN
    DECLARE v_id_borrador INT UNSIGNED;
    DECLARE v_firmantes_firmados INT;
    SET v_id_borrador = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONFORMIDAD' AND CODIGO = 'BORRADOR' LIMIT 1);
    SET v_firmantes_firmados = (SELECT COUNT(*) FROM PROYECTO_CONFORMIDAD_FIRMANTE WHERE ID_CONFORMIDAD = p_id_conformidad AND FECHA_FIRMA IS NOT NULL);

    IF v_firmantes_firmados = 0 THEN
        DELETE FROM PROYECTO_CONFORMIDAD_FIRMANTE WHERE ID_CONFORMIDAD = p_id_conformidad;

        UPDATE PROYECTO_CONFORMIDAD c
          JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
           SET c.ID_ESTADO_CONFORMIDAD = v_id_borrador, c.DOCUMENTO_PATH = NULL
         WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO = 'EMITIDA';
    END IF;
END$$

-- Guard: nunca se anula una conformidad ya FIRMADA (es respaldo legal de
-- una factura emitida/por emitir). Si quedo EMITIDA con firmantes
-- parciales, si se puede anular (ej. ya no se va a facturar ese hito).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_ANULAR(
    IN p_id_conformidad INT UNSIGNED,
    IN p_motivo VARCHAR(300),
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    DECLARE v_id_anulada INT UNSIGNED;
    SET v_id_anulada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONFORMIDAD' AND CODIGO = 'ANULADA' LIMIT 1);

    UPDATE PROYECTO_CONFORMIDAD c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
       SET c.ID_ESTADO_CONFORMIDAD = v_id_anulada, c.MOTIVO_ANULACION = p_motivo,
           c.FECHA_ANULACION = NOW(), c.USUARIO_ANULACION = p_id_usuario
     WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO IN ('BORRADOR', 'EMITIDA');
END$$

-- Deshace una creacion por error -- guard: solo si BORRADOR (borra sus
-- items y firmantes en cascada -- en la practica nunca deberia haber
-- firmantes en BORRADOR, se agregan recien al EMITIR, pero se limpia
-- por si acaso).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_ELIMINAR(
    IN p_id_conformidad INT UNSIGNED
)
BEGIN
    DELETE f FROM PROYECTO_CONFORMIDAD_FIRMANTE f
      JOIN PROYECTO_CONFORMIDAD c ON c.ID_CONFORMIDAD = f.ID_CONFORMIDAD
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
     WHERE f.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO = 'BORRADOR';

    DELETE i FROM PROYECTO_CONFORMIDAD_ITEM i
      JOIN PROYECTO_CONFORMIDAD c ON c.ID_CONFORMIDAD = i.ID_CONFORMIDAD
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
     WHERE i.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO = 'BORRADOR';

    DELETE c FROM PROYECTO_CONFORMIDAD c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
     WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO = 'BORRADOR';
END$$

-- Agrega un firmante nuevo (siempre PENDIENTE, sin token todavia -- se
-- genera aparte con SP_..._FIRMANTE_GENERAR_LINK). Permitido desde
-- EMITIDA o incluso FIRMADA: el negocio puede pedir sumar mas firmantes
-- a una conformidad que ya se habia dado por completa -- en ese caso dejar
-- de estar "completa" hasta que el nuevo tambien firme (vuelve a EMITIDA,
-- ver cabecera del archivo). No permitido en BORRADOR (los items/el PDF
-- todavia no existen) ni ANULADA.
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_AGREGAR(
    IN p_id_conformidad INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_cargo VARCHAR(150),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_firmante INT UNSIGNED
)
BEGIN
    DECLARE v_puede INT;
    DECLARE v_orden INT;
    DECLARE v_id_emitida INT UNSIGNED;

    SELECT COUNT(*) INTO v_puede
      FROM PROYECTO_CONFORMIDAD c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
     WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO IN ('EMITIDA', 'FIRMADA');

    IF v_puede = 1 THEN
        SET v_orden = (SELECT COALESCE(MAX(ORDEN), -1) + 1 FROM PROYECTO_CONFORMIDAD_FIRMANTE WHERE ID_CONFORMIDAD = p_id_conformidad);

        INSERT INTO PROYECTO_CONFORMIDAD_FIRMANTE (ID_CONFORMIDAD, NOMBRE, CARGO, ORDEN, USUARIO_CREACION)
        VALUES (p_id_conformidad, p_nombre, p_cargo, v_orden, p_id_usuario_creacion);
        SET p_id_firmante = LAST_INSERT_ID();

        SET v_id_emitida = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONFORMIDAD' AND CODIGO = 'EMITIDA' LIMIT 1);
        UPDATE PROYECTO_CONFORMIDAD c
          JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
           SET c.ID_ESTADO_CONFORMIDAD = v_id_emitida
         WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO = 'FIRMADA';
    ELSE
        SET p_id_firmante = NULL;
    END IF;
END$$

-- Para la descarga protegida (con sesion) del documento individual que
-- subio un firmante puntual -- ver api/facturacion/conformidades/firmantes/[id]/documento/route.ts.
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_OBTENER(
    IN p_id_firmante INT UNSIGNED
)
BEGIN
    SELECT ID_FIRMANTE, ID_CONFORMIDAD, NOMBRE, CARGO,
           FIRMA_PNG_PATH, DOCUMENTO_FIRMADO_INDIVIDUAL_PATH, FECHA_FIRMA
      FROM PROYECTO_CONFORMIDAD_FIRMANTE
     WHERE ID_FIRMANTE = p_id_firmante;
END$$

CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_LISTAR(
    IN p_id_conformidad INT UNSIGNED
)
BEGIN
    SELECT ID_FIRMANTE, ID_CONFORMIDAD, NOMBRE, CARGO, ORDEN,
           FIRMA_PNG_PATH, DOCUMENTO_FIRMADO_INDIVIDUAL_PATH, FECHA_FIRMA, USUARIO_FIRMA_REGISTRO,
           TOKEN_FIRMA, TOKEN_EXPIRA
      FROM PROYECTO_CONFORMIDAD_FIRMANTE
     WHERE ID_CONFORMIDAD = p_id_conformidad
     ORDER BY ORDEN, ID_FIRMANTE;
END$$

-- Guard: no se puede renombrar un firmante que ya firmo (alteraria a
-- quien representa una firma ya hecha).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_ACTUALIZAR(
    IN p_id_firmante INT UNSIGNED,
    IN p_nombre VARCHAR(150),
    IN p_cargo VARCHAR(150)
)
BEGIN
    UPDATE PROYECTO_CONFORMIDAD_FIRMANTE
       SET NOMBRE = p_nombre, CARGO = p_cargo
     WHERE ID_FIRMANTE = p_id_firmante AND FECHA_FIRMA IS NULL;
END$$

-- Guard: no se puede eliminar un firmante que ya firmo (es respaldo
-- legal). Si el firmante eliminado era el ultimo que faltaba, la
-- conformidad queda completa de inmediato (delega en
-- SP_..._RECALCULAR_ESTADO, cubre justo el caso "ya no hace falta que
-- firme fulano" que puede pedir el negocio en pleno proceso).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_ELIMINAR(
    IN p_id_firmante INT UNSIGNED
)
BEGIN
    DECLARE v_id_conformidad INT UNSIGNED;
    SELECT ID_CONFORMIDAD INTO v_id_conformidad FROM PROYECTO_CONFORMIDAD_FIRMANTE WHERE ID_FIRMANTE = p_id_firmante AND FECHA_FIRMA IS NULL;

    IF v_id_conformidad IS NOT NULL THEN
        DELETE FROM PROYECTO_CONFORMIDAD_FIRMANTE WHERE ID_FIRMANTE = p_id_firmante;
        CALL SP_PROYECTO_CONFORMIDAD_RECALCULAR_ESTADO(v_id_conformidad, NULL);
    END IF;
END$$

-- Mismo criterio que SP_RRHH_PRESTAMO_GENERAR_LINK: solo mientras la
-- conformidad sigue EMITIDA y este firmante puntual todavia no firmo.
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_GENERAR_LINK(
    IN p_id_firmante INT UNSIGNED,
    IN p_token CHAR(36),
    IN p_token_expira DATETIME
)
BEGIN
    UPDATE PROYECTO_CONFORMIDAD_FIRMANTE f
      JOIN PROYECTO_CONFORMIDAD c ON c.ID_CONFORMIDAD = f.ID_CONFORMIDAD
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
       SET f.TOKEN_FIRMA = p_token, f.TOKEN_EXPIRA = p_token_expira
     WHERE f.ID_FIRMANTE = p_id_firmante AND f.FECHA_FIRMA IS NULL AND ec.CODIGO = 'EMITIDA';
END$$

-- Para la pagina publica de firma (sin sesion): el token ahora identifica
-- a UN firmante puntual, no a toda la conformidad -- cada firmante tiene
-- su propio link. Trae tambien los datos de la conformidad/hito/proyecto/
-- cliente que la pagina necesita, en un solo viaje (items se piden aparte
-- con SP_PROYECTO_CONFORMIDAD_ITEM_LISTAR, son los mismos para cualquier
-- firmante).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_OBTENER_POR_TOKEN(
    IN p_token CHAR(36)
)
BEGIN
    SELECT f.ID_FIRMANTE, f.ID_CONFORMIDAD, f.NOMBRE AS FIRMANTE_NOMBRE, f.CARGO AS FIRMANTE_CARGO,
           f.FECHA_FIRMA, f.TOKEN_FIRMA, f.TOKEN_EXPIRA,
           c.TITULO, c.ID_ESTADO_CONFORMIDAD, ec.CODIGO AS ESTADO_CONFORMIDAD_CODIGO,
           c.DOCUMENTO_PATH, c.FECHA_EMISION,
           h.NOMBRE AS HITO_NOMBRE, h.MONTO AS HITO_MONTO,
           py.NOMBRE AS PROYECTO_NOMBRE, py.ID_MONEDA, m.CODIGO AS MONEDA_CODIGO,
           py.ID_CLIENTE, cl.RAZON_SOCIAL AS CLIENTE_RAZON_SOCIAL, cl.RUC AS CLIENTE_RUC
      FROM PROYECTO_CONFORMIDAD_FIRMANTE f
      JOIN PROYECTO_CONFORMIDAD c ON c.ID_CONFORMIDAD = f.ID_CONFORMIDAD
      JOIN PROYECTO_HITO h ON h.ID_HITO = c.ID_HITO
      JOIN PROYECTO py ON py.ID_PROYECTO = c.ID_PROYECTO
      JOIN MAESTRO_MAESTRO m ON m.ID_MAESTRO = py.ID_MONEDA
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
      LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = py.ID_CLIENTE
     WHERE f.TOKEN_FIRMA = p_token;
END$$

-- Registra la firma de ESTE firmante puntual (por el link publico, con
-- p_id_usuario=NULL -- "se autofirma" -- y p_documento_firmado_individual_path=NULL,
-- o por la subida manual del gestor, con su p_id_usuario y la ruta del
-- documento que subio). Guard: la conformidad debe seguir EMITIDA y este
-- firmante no debe haber firmado ya. Token de un solo uso (se limpia
-- aqui). NO decide por si solo si la conformidad completa -- eso es
-- responsabilidad de SP_..._RECALCULAR_ESTADO, que el llamador (la
-- action, en TS) invoca justo despues de regenerar el PDF combinado.
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_FIRMANTE_REGISTRAR_FIRMA(
    IN p_id_firmante INT UNSIGNED,
    IN p_firma_png_path VARCHAR(300),
    IN p_documento_firmado_individual_path VARCHAR(300),
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    UPDATE PROYECTO_CONFORMIDAD_FIRMANTE f
      JOIN PROYECTO_CONFORMIDAD c ON c.ID_CONFORMIDAD = f.ID_CONFORMIDAD
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
       SET f.FECHA_FIRMA = NOW(), f.FIRMA_PNG_PATH = p_firma_png_path,
           f.DOCUMENTO_FIRMADO_INDIVIDUAL_PATH = p_documento_firmado_individual_path,
           f.USUARIO_FIRMA_REGISTRO = p_id_usuario, f.TOKEN_FIRMA = NULL, f.TOKEN_EXPIRA = NULL
     WHERE f.ID_FIRMANTE = p_id_firmante AND f.FECHA_FIRMA IS NULL AND ec.CODIGO = 'EMITIDA';
END$$

-- Unica fuente de verdad de "la conformidad ya esta completa": compara
-- cuantos firmantes tiene contra cuantos ya firmaron. Si coinciden (y
-- hay al menos 1), pasa a FIRMADA. Se llama despues de registrar una
-- firma (con el PDF combinado recien regenerado, p_documento_firmado_path)
-- y despues de eliminar un firmante pendiente (con NULL, no cambia el
-- PDF ya guardado). Nunca hace nada si la conformidad esta en BORRADOR
-- o ANULADA, y nunca "desfirma" (si ya esta FIRMADA, el UPDATE de abajo
-- no matchea nada mas que refrescar el documento).
CREATE PROCEDURE SP_PROYECTO_CONFORMIDAD_RECALCULAR_ESTADO(
    IN p_id_conformidad INT UNSIGNED,
    IN p_documento_firmado_path VARCHAR(300)
)
BEGIN
    DECLARE v_total INT;
    DECLARE v_firmados INT;
    DECLARE v_id_firmada INT UNSIGNED;

    SELECT COUNT(*), SUM(FECHA_FIRMA IS NOT NULL) INTO v_total, v_firmados
      FROM PROYECTO_CONFORMIDAD_FIRMANTE WHERE ID_CONFORMIDAD = p_id_conformidad;
    SET v_id_firmada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CONFORMIDAD' AND CODIGO = 'FIRMADA' LIMIT 1);

    UPDATE PROYECTO_CONFORMIDAD c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CONFORMIDAD
       SET c.DOCUMENTO_FIRMADO_PATH = COALESCE(p_documento_firmado_path, c.DOCUMENTO_FIRMADO_PATH),
           c.ID_ESTADO_CONFORMIDAD = IF(v_total >= 1 AND v_total = v_firmados, v_id_firmada, c.ID_ESTADO_CONFORMIDAD),
           c.FECHA_FIRMA = IF(v_total >= 1 AND v_total = v_firmados AND ec.CODIGO != 'FIRMADA', NOW(), c.FECHA_FIRMA)
     WHERE c.ID_CONFORMIDAD = p_id_conformidad AND ec.CODIGO IN ('EMITIDA', 'FIRMADA');
END$$

DELIMITER ;
