-- =====================================================================
-- Prestamos a colaboradores y su cronograma de cuotas (ver
-- 041_rrhh_prestamo.sql). Las cuotas iguales/automaticas las arma la app
-- (mismo criterio que generarPeriodosPendientes: la logica de fechas y
-- reparto vive en TypeScript, aca solo se persiste) y las inserta una a
-- una con SP_RRHH_PRESTAMO_CUOTA_AGREGAR. El movimiento de desembolso
-- (si se eligio cuenta) lo registra la app DESPUES de crear el prestamo
-- (para poder referenciarlo desde CUENTA_MOVIMIENTO) y guarda su ID con
-- SP_RRHH_PRESTAMO_ASIGNAR_MOVIMIENTO.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CREAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_SOLICITAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_OTORGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_ASIGNAR_MOVIMIENTO;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_OBTENER;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_REGISTRAR_FIRMA;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_ANULAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_AGREGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_ACTUALIZAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_ELIMINAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_PENDIENTES_DEL_PERIODO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_VINCULAR_DETALLE;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_LISTAR_DEL_DETALLE;
DROP PROCEDURE IF EXISTS SP_RRHH_PRESTAMO_CUOTA_MARCAR_PAGADA_MANUAL;

DELIMITER $$

-- Nace PENDIENTE_FIRMA: el compromiso todavia no esta firmado, asi que la
-- planilla no descuenta nada hasta SP_RRHH_PRESTAMO_REGISTRAR_FIRMA. El
-- beneficiario es exactamente uno de los dos -- p_id_usuario (trabajador,
-- con descuento en planilla) o p_id_contacto (contacto externo del
-- directorio, sin planilla) -- no-op silencioso (p_id_prestamo queda
-- NULL) si viene mas de uno o ninguno, mismo criterio que el acreedor de
-- PASIVO en SP_PASIVO_CREAR.
CREATE PROCEDURE SP_RRHH_PRESTAMO_CREAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_id_contacto INT UNSIGNED,
    IN p_id_tipo_prestamo INT UNSIGNED,
    IN p_monto_total DECIMAL(12,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_descripcion VARCHAR(300),
    IN p_fecha_origen DATE,
    IN p_id_cuenta_desembolso INT UNSIGNED,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_prestamo INT UNSIGNED
)
BEGIN
    DECLARE v_id_pendiente_firma INT UNSIGNED;
    SET v_id_pendiente_firma = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PRESTAMO' AND CODIGO = 'PENDIENTE_FIRMA' LIMIT 1);

    IF (p_id_usuario IS NOT NULL) != (p_id_contacto IS NOT NULL) THEN
        INSERT INTO RRHH_PRESTAMO (
            ID_USUARIO, ID_CONTACTO, ID_TIPO_PRESTAMO, MONTO_TOTAL, ID_MONEDA, TIPO_CAMBIO, DESCRIPCION, FECHA_ORIGEN,
            ID_CUENTA_DESEMBOLSO, ID_ESTADO_PRESTAMO, USUARIO_CREACION
        ) VALUES (
            p_id_usuario, p_id_contacto, p_id_tipo_prestamo, p_monto_total, p_id_moneda, p_tipo_cambio, p_descripcion, p_fecha_origen,
            p_id_cuenta_desembolso, v_id_pendiente_firma, p_id_usuario_creacion
        );

        SET p_id_prestamo = LAST_INSERT_ID();
    END IF;
END$$

-- Solicitud: nace SOLICITADO -- sin cronograma, sin cuenta de desembolso,
-- sin TC -- eso lo completa RRHH al otorgarlo (SP_RRHH_PRESTAMO_OTORGAR).
-- El colaborador solicita para si mismo (p_id_usuario = su propia sesion,
-- p_id_contacto NULL); Gerencia/Administracion/RRHH pueden solicitar en
-- nombre de un trabajador o un contacto -- misma regla de "exactamente
-- uno" que SP_RRHH_PRESTAMO_CREAR. p_fecha_origen queda como fecha de
-- solicitud (informativa, se pisa con la fecha real de desembolso al
-- otorgar).
CREATE PROCEDURE SP_RRHH_PRESTAMO_SOLICITAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_id_contacto INT UNSIGNED,
    IN p_id_tipo_prestamo INT UNSIGNED,
    IN p_monto_total DECIMAL(12,2),
    IN p_id_moneda INT UNSIGNED,
    IN p_descripcion VARCHAR(300),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_prestamo INT UNSIGNED
)
BEGIN
    DECLARE v_id_solicitado INT UNSIGNED;
    SET v_id_solicitado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PRESTAMO' AND CODIGO = 'SOLICITADO' LIMIT 1);

    IF (p_id_usuario IS NOT NULL) != (p_id_contacto IS NOT NULL) THEN
        INSERT INTO RRHH_PRESTAMO (
            ID_USUARIO, ID_CONTACTO, ID_TIPO_PRESTAMO, MONTO_TOTAL, ID_MONEDA, DESCRIPCION, FECHA_ORIGEN,
            ID_ESTADO_PRESTAMO, USUARIO_CREACION
        ) VALUES (
            p_id_usuario, p_id_contacto, p_id_tipo_prestamo, p_monto_total, p_id_moneda, p_descripcion, CURDATE(),
            v_id_solicitado, p_id_usuario_creacion
        );

        SET p_id_prestamo = LAST_INSERT_ID();
    END IF;
END$$

-- RRHH revisa una solicitud y la otorga: fija la fecha real de
-- desembolso, el tipo de cambio (si no es soles) y la cuenta de
-- desembolso (opcional), y pasa a PENDIENTE_FIRMA -- desde ahi sigue
-- identico a un prestamo creado directo (la app arma el cronograma con
-- SP_RRHH_PRESTAMO_CUOTA_AGREGAR y, si hay cuenta, registra el
-- movimiento con SP_RRHH_PRESTAMO_ASIGNAR_MOVIMIENTO). No-op silencioso
-- si no estaba SOLICITADO.
CREATE PROCEDURE SP_RRHH_PRESTAMO_OTORGAR(
    IN p_id_prestamo INT UNSIGNED,
    IN p_fecha_origen DATE,
    IN p_tipo_cambio DECIMAL(10,4),
    IN p_id_cuenta_desembolso INT UNSIGNED
)
BEGIN
    DECLARE v_id_pendiente_firma INT UNSIGNED;
    SET v_id_pendiente_firma = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PRESTAMO' AND CODIGO = 'PENDIENTE_FIRMA' LIMIT 1);

    UPDATE RRHH_PRESTAMO p
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
       SET p.FECHA_ORIGEN = p_fecha_origen,
           p.TIPO_CAMBIO = p_tipo_cambio,
           p.ID_CUENTA_DESEMBOLSO = p_id_cuenta_desembolso,
           p.ID_ESTADO_PRESTAMO = v_id_pendiente_firma
     WHERE p.ID_PRESTAMO = p_id_prestamo AND ep.CODIGO = 'SOLICITADO';
END$$

-- Guarda el movimiento EGRESO del desembolso. No-op silencioso si el
-- prestamo ya tenia uno.
CREATE PROCEDURE SP_RRHH_PRESTAMO_ASIGNAR_MOVIMIENTO(
    IN p_id_prestamo INT UNSIGNED,
    IN p_id_movimiento INT UNSIGNED
)
BEGIN
    UPDATE RRHH_PRESTAMO
       SET ID_MOVIMIENTO_DESEMBOLSO = p_id_movimiento
     WHERE ID_PRESTAMO = p_id_prestamo AND ID_MOVIMIENTO_DESEMBOLSO IS NULL;
END$$

-- Un prestamo por fila con su avance: cuotas vigentes (sin las ANULADAS),
-- lo ya descontado y lo que falta, en la moneda del prestamo. p_id_usuario
-- NULL = todos (trabajadores y contactos); si viene informado, solo trae
-- los del trabajador (un contacto no tiene ID_USUARIO, nunca calza con
-- este filtro -- correcto, se usa solo desde la ficha de un trabajador).
-- NOMBRES/APELLIDOS/ES_CONTACTO combinan el que corresponda segun el
-- beneficiario.
CREATE PROCEDURE SP_RRHH_PRESTAMO_LISTAR(
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    SELECT p.ID_PRESTAMO, p.ID_USUARIO, p.ID_CONTACTO,
           COALESCE(u.NOMBRES, dc.NOMBRES) AS NOMBRES, COALESCE(u.APELLIDOS, dc.APELLIDOS) AS APELLIDOS,
           (p.ID_CONTACTO IS NOT NULL) AS ES_CONTACTO,
           p.MONTO_TOTAL, p.ID_MONEDA, mo.CODIGO AS MONEDA_CODIGO, p.TIPO_CAMBIO,
           p.DESCRIPCION, p.FECHA_ORIGEN,
           p.ID_TIPO_PRESTAMO, tp.CODIGO AS TIPO_PRESTAMO_CODIGO, tp.DESCRIPCION AS TIPO_PRESTAMO_DESCRIPCION,
           p.ID_ESTADO_PRESTAMO, ep.CODIGO AS ESTADO_PRESTAMO_CODIGO, ep.DESCRIPCION AS ESTADO_PRESTAMO_DESCRIPCION,
           p.FECHA_FIRMA_COMPROMISO,
           (SELECT COUNT(*) FROM RRHH_PRESTAMO_CUOTA c
              JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
             WHERE c.ID_PRESTAMO = p.ID_PRESTAMO AND ec.CODIGO != 'ANULADA') AS TOTAL_CUOTAS,
           (SELECT COALESCE(SUM(c.MONTO), 0) FROM RRHH_PRESTAMO_CUOTA c
              JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
             WHERE c.ID_PRESTAMO = p.ID_PRESTAMO AND ec.CODIGO = 'DESCONTADA') AS MONTO_DESCONTADO,
           (SELECT COALESCE(SUM(c.MONTO), 0) FROM RRHH_PRESTAMO_CUOTA c
              JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
             WHERE c.ID_PRESTAMO = p.ID_PRESTAMO AND ec.CODIGO = 'PENDIENTE') AS MONTO_PENDIENTE
      FROM RRHH_PRESTAMO p
      LEFT JOIN USUARIO u ON u.ID_USUARIO = p.ID_USUARIO
      LEFT JOIN DIRECTORIO_CONTACTO_EXTERNO dc ON dc.ID_CONTACTO = p.ID_CONTACTO
      JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PRESTAMO
     WHERE p_id_usuario IS NULL OR p.ID_USUARIO = p_id_usuario
     ORDER BY p.FECHA_CREACION DESC, p.ID_PRESTAMO DESC;
END$$

-- Detalle completo para la pantalla y para el compromiso en PDF. Si el
-- beneficiario es un trabajador, trae su identidad de RRHH_EMPLEADO
-- (documento, direccion, puesto); si es un contacto externo, esos campos
-- quedan NULL (DIRECTORIO_CONTACTO_EXTERNO no guarda documento de
-- identidad) -- el PDF y las pantallas ya toleran valores nulos ahi.
CREATE PROCEDURE SP_RRHH_PRESTAMO_OBTENER(
    IN p_id_prestamo INT UNSIGNED
)
BEGIN
    SELECT p.ID_PRESTAMO, p.ID_USUARIO, p.ID_CONTACTO,
           COALESCE(u.NOMBRES, dc.NOMBRES) AS NOMBRES, COALESCE(u.APELLIDOS, dc.APELLIDOS) AS APELLIDOS,
           (p.ID_CONTACTO IS NOT NULL) AS ES_CONTACTO,
           u.CORREO,
           COALESCE(e.PUESTO, dc.CARGO) AS PUESTO,
           td.DESCRIPCION AS TIPO_DOCUMENTO_DESCRIPCION, e.NRO_DOCUMENTO, e.DIRECCION,
           p.MONTO_TOTAL, p.ID_MONEDA, mo.CODIGO AS MONEDA_CODIGO, mo.DESCRIPCION AS MONEDA_DESCRIPCION, p.TIPO_CAMBIO,
           p.DESCRIPCION, p.FECHA_ORIGEN,
           p.ID_TIPO_PRESTAMO, tp.CODIGO AS TIPO_PRESTAMO_CODIGO, tp.DESCRIPCION AS TIPO_PRESTAMO_DESCRIPCION,
           p.ID_CUENTA_DESEMBOLSO, ce.NOMBRE AS CUENTA_DESEMBOLSO_NOMBRE, p.ID_MOVIMIENTO_DESEMBOLSO,
           p.ID_ESTADO_PRESTAMO, ep.CODIGO AS ESTADO_PRESTAMO_CODIGO, ep.DESCRIPCION AS ESTADO_PRESTAMO_DESCRIPCION,
           p.DOCUMENTO_FIRMADO_PATH, p.FECHA_FIRMA_COMPROMISO,
           p.MOTIVO_ANULACION, p.FECHA_ANULACION,
           p.FECHA_CREACION
      FROM RRHH_PRESTAMO p
      LEFT JOIN USUARIO u ON u.ID_USUARIO = p.ID_USUARIO
      LEFT JOIN RRHH_EMPLEADO e ON e.ID_USUARIO = u.ID_USUARIO
      LEFT JOIN MAESTRO_MAESTRO td ON td.ID_MAESTRO = e.ID_TIPO_DOCUMENTO
      LEFT JOIN DIRECTORIO_CONTACTO_EXTERNO dc ON dc.ID_CONTACTO = p.ID_CONTACTO
      JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PRESTAMO
      LEFT JOIN CUENTA_EMPRESA ce ON ce.ID_CUENTA = p.ID_CUENTA_DESEMBOLSO
     WHERE p.ID_PRESTAMO = p_id_prestamo;
END$$

-- La app ya guardo el archivo firmado antes de llamar esto (mismo orden
-- que la firma de contratos: primero el archivo, despues persistir la
-- ruta). Pasa a ACTIVO -- desde aca sus cuotas entran a la planilla.
-- Tambien sirve para reemplazar el archivo (ya ACTIVO). No-op silencioso
-- si el prestamo esta ANULADO.
CREATE PROCEDURE SP_RRHH_PRESTAMO_REGISTRAR_FIRMA(
    IN p_id_prestamo INT UNSIGNED,
    IN p_documento_path VARCHAR(300),
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PRESTAMO' AND CODIGO = 'ACTIVO' LIMIT 1);

    UPDATE RRHH_PRESTAMO p
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
       SET p.ID_ESTADO_PRESTAMO = v_id_activo, p.DOCUMENTO_FIRMADO_PATH = p_documento_path,
           p.FECHA_FIRMA_COMPROMISO = NOW(), p.USUARIO_FIRMA_REGISTRO = p_id_usuario
     WHERE p.ID_PRESTAMO = p_id_prestamo AND ep.CODIGO IN ('PENDIENTE_FIRMA', 'ACTIVO');
END$$

-- No-op silencioso si alguna cuota ya fue tomada por una planilla
-- (ID_PLANILLA_DETALLE, ya sea descontada o solo reservada) -- mismo
-- criterio que SP_PASIVO_ANULAR con cuotas pagadas. Cascada: las cuotas
-- todavia PENDIENTE pasan a ANULADA para que la planilla deje de
-- tomarlas.
CREATE PROCEDURE SP_RRHH_PRESTAMO_ANULAR(
    IN p_id_prestamo INT UNSIGNED,
    IN p_motivo VARCHAR(300),
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    DECLARE v_cuotas_tomadas INT;
    DECLARE v_id_anulado INT UNSIGNED;
    DECLARE v_id_cuota_anulada INT UNSIGNED;
    DECLARE v_id_cuota_pendiente INT UNSIGNED;

    SELECT COUNT(*) INTO v_cuotas_tomadas
      FROM RRHH_PRESTAMO_CUOTA
     WHERE ID_PRESTAMO = p_id_prestamo AND ID_PLANILLA_DETALLE IS NOT NULL;

    IF v_cuotas_tomadas = 0 THEN
        SET v_id_anulado = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_PRESTAMO' AND CODIGO = 'ANULADO' LIMIT 1);
        SET v_id_cuota_anulada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA_PRESTAMO' AND CODIGO = 'ANULADA' LIMIT 1);
        SET v_id_cuota_pendiente = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA_PRESTAMO' AND CODIGO = 'PENDIENTE' LIMIT 1);

        UPDATE RRHH_PRESTAMO p
          JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
           SET p.ID_ESTADO_PRESTAMO = v_id_anulado, p.MOTIVO_ANULACION = p_motivo,
               p.FECHA_ANULACION = NOW(), p.USUARIO_ANULACION = p_id_usuario
         WHERE p.ID_PRESTAMO = p_id_prestamo AND ep.CODIGO != 'ANULADO';

        UPDATE RRHH_PRESTAMO_CUOTA
           SET ID_ESTADO_CUOTA = v_id_cuota_anulada
         WHERE ID_PRESTAMO = p_id_prestamo AND ID_ESTADO_CUOTA = v_id_cuota_pendiente;
    END IF;
END$$

-- No-op silencioso (p_id_cuota queda NULL) si el prestamo esta ANULADO.
CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_AGREGAR(
    IN p_id_prestamo INT UNSIGNED,
    IN p_nro_cuota INT UNSIGNED,
    IN p_anio SMALLINT UNSIGNED,
    IN p_mes TINYINT UNSIGNED,
    IN p_monto DECIMAL(12,2),
    IN p_calculo_automatico TINYINT,
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_cuota INT UNSIGNED
)
BEGIN
    DECLARE v_id_pendiente INT UNSIGNED;
    SET v_id_pendiente = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA_PRESTAMO' AND CODIGO = 'PENDIENTE' LIMIT 1);

    IF EXISTS (
        SELECT 1 FROM RRHH_PRESTAMO p
          JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
         WHERE p.ID_PRESTAMO = p_id_prestamo AND ep.CODIGO != 'ANULADO'
    ) THEN
        INSERT INTO RRHH_PRESTAMO_CUOTA (ID_PRESTAMO, NRO_CUOTA, ANIO, MES, MONTO, CALCULO_AUTOMATICO, ID_ESTADO_CUOTA, USUARIO_CREACION)
        VALUES (p_id_prestamo, p_nro_cuota, p_anio, p_mes, p_monto, p_calculo_automatico, v_id_pendiente, p_id_usuario_creacion);

        SET p_id_cuota = LAST_INSERT_ID();
    END IF;
END$$

-- Cronograma completo (incluye ANULADAS, para que quede el historial).
-- Orden cronologico por periodo, no por NRO_CUOTA -- una cuota extra de
-- julio/diciembre se intercala donde le toca.
CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_LISTAR(
    IN p_id_prestamo INT UNSIGNED
)
BEGIN
    SELECT c.ID_CUOTA, c.ID_PRESTAMO, c.NRO_CUOTA, c.ANIO, c.MES, c.MONTO, c.CALCULO_AUTOMATICO,
           c.ID_ESTADO_CUOTA, ec.CODIGO AS ESTADO_CUOTA_CODIGO, ec.DESCRIPCION AS ESTADO_CUOTA_DESCRIPCION,
           c.ID_PLANILLA_DETALLE, c.MONTO_DESCONTADO_SOLES, c.FECHA_DESCUENTO,
           c.FECHA_CREACION, c.FECHA_MODIFICACION
      FROM RRHH_PRESTAMO_CUOTA c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
     WHERE c.ID_PRESTAMO = p_id_prestamo
     ORDER BY c.ANIO, c.MES, c.NRO_CUOTA;
END$$

-- Editable solo mientras esta PENDIENTE y ninguna planilla la tomo
-- todavia -- no-op silencioso despues. Cualquier cambio marca
-- CALCULO_AUTOMATICO=0 ("personalizada").
CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_ACTUALIZAR(
    IN p_id_cuota INT UNSIGNED,
    IN p_anio SMALLINT UNSIGNED,
    IN p_mes TINYINT UNSIGNED,
    IN p_monto DECIMAL(12,2)
)
BEGIN
    UPDATE RRHH_PRESTAMO_CUOTA c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
       SET c.ANIO = p_anio, c.MES = p_mes, c.MONTO = p_monto, c.CALCULO_AUTOMATICO = 0
     WHERE c.ID_CUOTA = p_id_cuota AND ec.CODIGO = 'PENDIENTE' AND c.ID_PLANILLA_DETALLE IS NULL;
END$$

CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_ELIMINAR(
    IN p_id_cuota INT UNSIGNED
)
BEGIN
    DELETE c FROM RRHH_PRESTAMO_CUOTA c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
     WHERE c.ID_CUOTA = p_id_cuota AND ec.CODIGO = 'PENDIENTE' AND c.ID_PLANILLA_DETALLE IS NULL;
END$$

-- Lo que la planilla de (p_anio, p_mes) debe descontarle a este
-- colaborador: cuotas PENDIENTE, de prestamos ACTIVO (compromiso
-- firmado), que ninguna planilla tomo todavia, cuyo periodo ya llego
-- (<= el de la planilla) -- una cuota que no alcanzo a descontarse en su
-- mes (ej. el compromiso se firmo tarde) se cobra en la primera
-- planilla posible en vez de quedarse sin descontar.
CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_PENDIENTES_DEL_PERIODO_LISTAR(
    IN p_id_usuario INT UNSIGNED,
    IN p_anio SMALLINT UNSIGNED,
    IN p_mes TINYINT UNSIGNED
)
BEGIN
    SELECT c.ID_CUOTA, c.ID_PRESTAMO, c.NRO_CUOTA, c.ANIO, c.MES, c.MONTO,
           mo.CODIGO AS MONEDA_CODIGO, p.TIPO_CAMBIO, p.DESCRIPCION, tp.CODIGO AS TIPO_PRESTAMO_CODIGO,
           (SELECT COUNT(*) FROM RRHH_PRESTAMO_CUOTA c2
              JOIN MAESTRO_MAESTRO ec2 ON ec2.ID_MAESTRO = c2.ID_ESTADO_CUOTA
             WHERE c2.ID_PRESTAMO = c.ID_PRESTAMO AND ec2.CODIGO != 'ANULADA') AS TOTAL_CUOTAS
      FROM RRHH_PRESTAMO_CUOTA c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
      JOIN RRHH_PRESTAMO p ON p.ID_PRESTAMO = c.ID_PRESTAMO
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
      JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PRESTAMO
     WHERE p.ID_USUARIO = p_id_usuario
       AND ep.CODIGO = 'ACTIVO'
       AND ec.CODIGO = 'PENDIENTE'
       AND c.ID_PLANILLA_DETALLE IS NULL
       AND (c.ANIO * 12 + c.MES) <= (p_anio * 12 + p_mes)
     ORDER BY c.ANIO, c.MES, c.ID_PRESTAMO, c.NRO_CUOTA;
END$$

-- Reserva la cuota para este detalle (todavia PENDIENTE hasta que el
-- detalle se emita) y guarda lo que se resto en soles. No-op silencioso
-- si otra planilla ya la habia tomado -- idempotente si se reintenta
-- "Generar planilla".
CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_VINCULAR_DETALLE(
    IN p_id_cuota INT UNSIGNED,
    IN p_id_planilla_detalle INT UNSIGNED,
    IN p_monto_descontado_soles DECIMAL(12,2)
)
BEGIN
    UPDATE RRHH_PRESTAMO_CUOTA c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
       SET c.ID_PLANILLA_DETALLE = p_id_planilla_detalle, c.MONTO_DESCONTADO_SOLES = p_monto_descontado_soles
     WHERE c.ID_CUOTA = p_id_cuota AND ec.CODIGO = 'PENDIENTE' AND c.ID_PLANILLA_DETALLE IS NULL;
END$$

-- Desglose de lo descontado en un detalle -- para la boleta/RxH y la
-- pantalla de detalle de planilla.
CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_LISTAR_DEL_DETALLE(
    IN p_id_planilla_detalle INT UNSIGNED
)
BEGIN
    SELECT c.ID_CUOTA, c.ID_PRESTAMO, c.NRO_CUOTA, c.ANIO, c.MES, c.MONTO,
           mo.CODIGO AS MONEDA_CODIGO, p.TIPO_CAMBIO, p.DESCRIPCION, tp.CODIGO AS TIPO_PRESTAMO_CODIGO, c.MONTO_DESCONTADO_SOLES,
           (SELECT COUNT(*) FROM RRHH_PRESTAMO_CUOTA c2
              JOIN MAESTRO_MAESTRO ec2 ON ec2.ID_MAESTRO = c2.ID_ESTADO_CUOTA
             WHERE c2.ID_PRESTAMO = c.ID_PRESTAMO AND ec2.CODIGO != 'ANULADA') AS TOTAL_CUOTAS
      FROM RRHH_PRESTAMO_CUOTA c
      JOIN RRHH_PRESTAMO p ON p.ID_PRESTAMO = c.ID_PRESTAMO
      JOIN MAESTRO_MAESTRO mo ON mo.ID_MAESTRO = p.ID_MONEDA
      JOIN MAESTRO_MAESTRO tp ON tp.ID_MAESTRO = p.ID_TIPO_PRESTAMO
     WHERE c.ID_PLANILLA_DETALLE = p_id_planilla_detalle
     ORDER BY c.ANIO, c.MES, c.ID_PRESTAMO, c.NRO_CUOTA;
END$$

-- Para un prestamo con beneficiario CONTACTO (sin planilla de donde
-- descontar) -- marca a mano una cuota PENDIENTE como pagada. Restringido
-- a prestamos de contacto (p.ID_CONTACTO IS NOT NULL): un prestamo de
-- trabajador se descuenta solo via SP_RRHH_PRESTAMO_CUOTA_VINCULAR_DETALLE
-- + la emision de planilla, nunca a mano, para no duplicar/saltarse ese
-- flujo. No-op silencioso si la cuota no esta PENDIENTE, ya fue tomada
-- por una planilla (no deberia pasar para un contacto, pero por las
-- dudas) o el prestamo no es ACTIVO.
CREATE PROCEDURE SP_RRHH_PRESTAMO_CUOTA_MARCAR_PAGADA_MANUAL(
    IN p_id_cuota INT UNSIGNED
)
BEGIN
    DECLARE v_id_descontada INT UNSIGNED;
    SET v_id_descontada = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_CUOTA_PRESTAMO' AND CODIGO = 'DESCONTADA' LIMIT 1);

    UPDATE RRHH_PRESTAMO_CUOTA c
      JOIN MAESTRO_MAESTRO ec ON ec.ID_MAESTRO = c.ID_ESTADO_CUOTA
      JOIN RRHH_PRESTAMO p ON p.ID_PRESTAMO = c.ID_PRESTAMO
      JOIN MAESTRO_MAESTRO ep ON ep.ID_MAESTRO = p.ID_ESTADO_PRESTAMO
       SET c.ID_ESTADO_CUOTA = v_id_descontada, c.FECHA_DESCUENTO = NOW()
     WHERE c.ID_CUOTA = p_id_cuota
       AND ec.CODIGO = 'PENDIENTE'
       AND c.ID_PLANILLA_DETALLE IS NULL
       AND p.ID_CONTACTO IS NOT NULL
       AND ep.CODIGO = 'ACTIVO';
END$$

DELIMITER ;
