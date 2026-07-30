-- =====================================================================
-- Procedimientos de USUARIO: login, intentos fallidos, CRUD basico.
-- El hash de clave se compara siempre en la aplicacion (bcrypt), nunca
-- en SQL; estos SPs solo leen/escriben el hash almacenado.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_USUARIO_OBTENER_PARA_LOGIN;
DROP PROCEDURE IF EXISTS SP_USUARIO_REGISTRAR_LOGIN_EXITOSO;
DROP PROCEDURE IF EXISTS SP_USUARIO_REGISTRAR_LOGIN_FALLIDO;
DROP PROCEDURE IF EXISTS SP_USUARIO_OBTENER_PERFIL;
DROP PROCEDURE IF EXISTS SP_USUARIO_CREAR;
DROP PROCEDURE IF EXISTS SP_USUARIO_LISTAR;
DROP PROCEDURE IF EXISTS SP_USUARIO_ROL_ASIGNAR;
DROP PROCEDURE IF EXISTS SP_USUARIO_ROL_REVOCAR;
DROP PROCEDURE IF EXISTS SP_USUARIO_ROL_LISTAR_ACTIVOS;
DROP PROCEDURE IF EXISTS SP_USUARIO_ROL_LISTAR_ACTIVOS_POR_USUARIO;
DROP PROCEDURE IF EXISTS SP_USUARIO_RESETEAR_CLAVE;

DELIMITER $$

CREATE PROCEDURE SP_USUARIO_OBTENER_PARA_LOGIN(
    IN p_usuario VARCHAR(50)
)
BEGIN
    SELECT u.ID_USUARIO, u.USUARIO, u.CLAVE_HASH, u.NOMBRES, u.APELLIDOS,
           u.REQUIERE_CAMBIO_CLAVE, u.INTENTOS_FALLIDOS, u.FECHA_BLOQUEO,
           u.ID_ESTADO_USUARIO, e.CODIGO AS ESTADO_USUARIO_CODIGO
      FROM USUARIO u
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = u.ID_ESTADO_USUARIO
     WHERE u.USUARIO = p_usuario
     LIMIT 1;
END$$

CREATE PROCEDURE SP_USUARIO_REGISTRAR_LOGIN_EXITOSO(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    UPDATE USUARIO
       SET INTENTOS_FALLIDOS = 0,
           FECHA_BLOQUEO = NULL,
           ULTIMO_LOGIN = NOW()
     WHERE ID_USUARIO = p_id_usuario;
END$$

CREATE PROCEDURE SP_USUARIO_REGISTRAR_LOGIN_FALLIDO(
    IN p_id_usuario INT UNSIGNED,
    IN p_max_intentos INT
)
BEGIN
    DECLARE v_id_bloqueado INT UNSIGNED;
    DECLARE v_intentos INT;

    UPDATE USUARIO SET INTENTOS_FALLIDOS = INTENTOS_FALLIDOS + 1 WHERE ID_USUARIO = p_id_usuario;

    SELECT INTENTOS_FALLIDOS INTO v_intentos FROM USUARIO WHERE ID_USUARIO = p_id_usuario;

    IF v_intentos >= p_max_intentos THEN
        SET v_id_bloqueado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_USUARIO' AND CODIGO = 'BLOQUEADO' LIMIT 1);
        UPDATE USUARIO
           SET ID_ESTADO_USUARIO = v_id_bloqueado, FECHA_BLOQUEO = NOW()
         WHERE ID_USUARIO = p_id_usuario;
    END IF;
END$$

CREATE PROCEDURE SP_USUARIO_OBTENER_PERFIL(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    SELECT u.ID_USUARIO, u.USUARIO, u.CORREO, u.NOMBRES, u.APELLIDOS, u.ULTIMO_LOGIN,
           r.ID_ROL, r.CODIGO AS ROL_CODIGO, r.NOMBRE AS ROL_NOMBRE, r.NIVEL_JERARQUICO,
           a.ID_AREA, a.CODIGO AS AREA_CODIGO, a.NOMBRE AS AREA_NOMBRE
      FROM USUARIO u
      LEFT JOIN USUARIO_ROL ur ON ur.ID_USUARIO = u.ID_USUARIO AND ur.ES_PRINCIPAL = 1
      LEFT JOIN ROL r ON r.ID_ROL = ur.ID_ROL
      LEFT JOIN AREA a ON a.ID_AREA = r.ID_AREA
     WHERE u.ID_USUARIO = p_id_usuario;
END$$

-- p_usuario es opcional: si viene NULL/vacio, el login se autogenera como
-- "nombre.apellido" (primer nombre + primer apellido, sin tildes/enie,
-- en minusculas) y se le agrega un sufijo numerico si ya existe. Si se
-- pasa un valor explicito (usado hoy solo por scripts/seed-admin.mjs para
-- el primer SUPER_ADMIN), se respeta ese valor con la misma logica de
-- sufijo ante colision.
-- El login (USUARIO) nunca choca con UQ_USUARIO_LOGIN porque se
-- autogenera con sufijo incremental (v_candidato/v_sufijo). El CORREO si
-- lo elige quien crea el usuario y puede chocar con UQ_USUARIO_CORREO --
-- no-op silencioso en ese caso (p_id_usuario_nuevo/p_usuario_generado
-- quedan NULL), mismo criterio que SP_AREA_CREAR/SP_ROL_CREAR.
CREATE PROCEDURE SP_USUARIO_CREAR(
    IN p_usuario VARCHAR(50),
    IN p_correo VARCHAR(150),
    IN p_clave_hash VARCHAR(255),
    IN p_nombres VARCHAR(100),
    IN p_apellidos VARCHAR(100),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_usuario_nuevo INT UNSIGNED,
    OUT p_usuario_generado VARCHAR(50)
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    DECLARE v_base VARCHAR(100);
    DECLARE v_candidato VARCHAR(50);
    DECLARE v_sufijo INT DEFAULT 1;

    IF NOT EXISTS (SELECT 1 FROM USUARIO WHERE CORREO = p_correo) THEN
        SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_USUARIO' AND CODIGO = 'ACTIVO' LIMIT 1);

        IF p_usuario IS NOT NULL AND p_usuario <> '' THEN
            SET v_base = LOWER(p_usuario);
        ELSE
            SET v_base = LOWER(CONCAT(SUBSTRING_INDEX(TRIM(p_nombres), ' ', 1), '.', SUBSTRING_INDEX(TRIM(p_apellidos), ' ', 1)));
            SET v_base = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(v_base, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n');
            SET v_base = REGEXP_REPLACE(v_base, '[^a-z0-9.]', '');
        END IF;

        SET v_candidato = v_base;
        WHILE EXISTS (SELECT 1 FROM USUARIO WHERE USUARIO = v_candidato) DO
            SET v_sufijo = v_sufijo + 1;
            SET v_candidato = CONCAT(v_base, v_sufijo);
        END WHILE;

        -- REQUIERE_CAMBIO_CLAVE siempre nace en 1: la clave la genera el
        -- backend (ver lib/auth/password.ts generarClaveTemporal), nunca la
        -- elige la persona, asi que debe cambiarla en su primer ingreso.
        INSERT INTO USUARIO (USUARIO, CORREO, CLAVE_HASH, NOMBRES, APELLIDOS, ID_ESTADO_USUARIO, REQUIERE_CAMBIO_CLAVE, USUARIO_CREACION)
        VALUES (v_candidato, p_correo, p_clave_hash, p_nombres, p_apellidos, v_id_activo, 1, p_id_usuario_creacion);

        SET p_id_usuario_nuevo = LAST_INSERT_ID();
        SET p_usuario_generado = v_candidato;
    END IF;
END$$

CREATE PROCEDURE SP_USUARIO_LISTAR(
    IN p_solo_activos TINYINT
)
BEGIN
    SELECT u.ID_USUARIO, u.USUARIO, u.CORREO, u.NOMBRES, u.APELLIDOS,
           u.ID_ESTADO_USUARIO, e.CODIGO AS ESTADO_USUARIO_CODIGO, u.ULTIMO_LOGIN
      FROM USUARIO u
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = u.ID_ESTADO_USUARIO
     WHERE (p_solo_activos = 0 OR e.CODIGO = 'ACTIVO')
     ORDER BY u.APELLIDOS, u.NOMBRES;
END$$

CREATE PROCEDURE SP_USUARIO_ROL_ASIGNAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_id_rol INT UNSIGNED,
    IN p_es_principal TINYINT
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    IF p_es_principal = 1 THEN
        UPDATE USUARIO_ROL SET ES_PRINCIPAL = 0 WHERE ID_USUARIO = p_id_usuario;
    END IF;

    INSERT INTO USUARIO_ROL (ID_USUARIO, ID_ROL, ES_PRINCIPAL, ID_ESTADO)
    VALUES (p_id_usuario, p_id_rol, p_es_principal, v_id_activo)
    ON DUPLICATE KEY UPDATE ES_PRINCIPAL = p_es_principal, ID_ESTADO = v_id_activo;
END$$

-- Revocacion logica (ID_ESTADO=INACTIVO, no DELETE): asi se conserva el
-- historial y las SPs que ya filtran por ID_ESTADO=ACTIVO (RBAC, horario,
-- listados) dejan de considerar el rol automaticamente sin tocarlas.
CREATE PROCEDURE SP_USUARIO_ROL_REVOCAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_id_rol INT UNSIGNED
)
BEGIN
    DECLARE v_id_inactivo INT UNSIGNED;
    DECLARE v_usuario_login VARCHAR(50);
    DECLARE v_rol_codigo VARCHAR(50);

    SET v_id_inactivo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'INACTIVO' LIMIT 1);
    SELECT USUARIO INTO v_usuario_login FROM USUARIO WHERE ID_USUARIO = p_id_usuario;
    SELECT CODIGO INTO v_rol_codigo FROM ROL WHERE ID_ROL = p_id_rol;

    -- Salvaguarda de seguridad: la cuenta bootstrap 'admin' nunca pierde
    -- SUPER_ADMIN, para no quedar sin nadie que pueda administrar la
    -- intranet. No-op silencioso (no SIGNAL) para no romper el flujo del
    -- formulario; el chip simplemente no se muestra como removible.
    IF NOT (v_usuario_login = 'admin' AND v_rol_codigo = 'SUPER_ADMIN') THEN
        UPDATE USUARIO_ROL
           SET ID_ESTADO = v_id_inactivo, ES_PRINCIPAL = 0
         WHERE ID_USUARIO = p_id_usuario AND ID_ROL = p_id_rol;
    END IF;
END$$

-- Todas las asignaciones activas de todos los usuarios, para pintar los
-- "chips" de rol con boton de revocar en /administracion/usuarios sin
-- hacer una consulta por usuario. ROL_CODIGO se usa para detectar la
-- combinacion protegida usuario='admin' + SUPER_ADMIN y no ofrecer el
-- boton de quitar en ese caso.
CREATE PROCEDURE SP_USUARIO_ROL_LISTAR_ACTIVOS()
BEGIN
    SELECT ur.ID_USUARIO, r.ID_ROL, r.NOMBRE AS ROL_NOMBRE, r.CODIGO AS ROL_CODIGO, ur.ES_PRINCIPAL
      FROM USUARIO_ROL ur
      JOIN ROL r ON r.ID_ROL = ur.ID_ROL
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = ur.ID_ESTADO
     WHERE e.CODIGO = 'ACTIVO'
     ORDER BY r.NOMBRE;
END$$

-- Version filtrada por un solo usuario -- usada para comprobar si tiene
-- el rol SUPER_ADMIN (ver requireSuperAdmin/esSuperAdmin en
-- src/lib/auth/require-permiso.ts), sin traer los roles de todo el mundo.
CREATE PROCEDURE SP_USUARIO_ROL_LISTAR_ACTIVOS_POR_USUARIO(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    SELECT ur.ID_USUARIO, r.ID_ROL, r.NOMBRE AS ROL_NOMBRE, r.CODIGO AS ROL_CODIGO, ur.ES_PRINCIPAL
      FROM USUARIO_ROL ur
      JOIN ROL r ON r.ID_ROL = ur.ID_ROL
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = ur.ID_ESTADO
     WHERE e.CODIGO = 'ACTIVO' AND ur.ID_USUARIO = p_id_usuario
     ORDER BY r.NOMBRE;
END$$

-- Reseteo de clave por un SUPER_ADMIN: la clave nueva se genera y hashea
-- en el backend igual que en SP_USUARIO_CREAR (ver lib/auth/password.ts),
-- nunca la elige nadie a mano. De paso desbloquea la cuenta (limpia
-- INTENTOS_FALLIDOS/FECHA_BLOQUEO y la reactiva) -- resetear la clave es
-- tipicamente como se ayuda a alguien que quedo bloqueado a volver a entrar.
CREATE PROCEDURE SP_USUARIO_RESETEAR_CLAVE(
    IN p_id_usuario INT UNSIGNED,
    IN p_clave_hash VARCHAR(255)
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_USUARIO' AND CODIGO = 'ACTIVO' LIMIT 1);

    UPDATE USUARIO
       SET CLAVE_HASH = p_clave_hash,
           REQUIERE_CAMBIO_CLAVE = 1,
           INTENTOS_FALLIDOS = 0,
           FECHA_BLOQUEO = NULL,
           ID_ESTADO_USUARIO = v_id_activo
     WHERE ID_USUARIO = p_id_usuario;
END$$

DELIMITER ;
