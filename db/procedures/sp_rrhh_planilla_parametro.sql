-- =====================================================================
-- Parametros legales de planilla (UIT, tasas AFP/ONP/EsSalud/Renta
-- 4ta-5ta): ledger de solo insertar, "vigente" = la version mas
-- reciente cuya FECHA_VIGENCIA_DESDE ya paso. Sin ACTUALIZAR/ELIMINAR --
-- corregir una tasa es crear una version nueva (ver 039_rrhh_planilla_
-- parametro.sql). CREAR + TRAMO_AGREGAR + AFP_FONDO_AGREGAR se llaman en
-- secuencia desde la app (una version, N tramos, N fondos), mismo estilo
-- que crear un pasivo y despues agregar sus cuotas una por una.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_PARAMETRO_CREAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_AGREGAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_PARAMETRO_OBTENER_VIGENTE;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_PARAMETRO_TRAMO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_PLANILLA_PARAMETRO_LISTAR;

DELIMITER $$

CREATE PROCEDURE SP_RRHH_PLANILLA_PARAMETRO_CREAR(
    IN p_anio SMALLINT UNSIGNED,
    IN p_fecha_vigencia_desde DATE,
    IN p_uit DECIMAL(10,2),
    IN p_porcentaje_onp DECIMAL(5,2),
    IN p_porcentaje_essalud DECIMAL(5,2),
    IN p_aporte_obligatorio_afp_porcentaje DECIMAL(5,2),
    IN p_prima_seguro_afp_porcentaje DECIMAL(5,2),
    IN p_tope_asegurable_afp DECIMAL(10,2),
    IN p_porcentaje_renta_4ta DECIMAL(5,2),
    IN p_umbral_renta_4ta DECIMAL(10,2),
    IN p_uit_deduccion_renta_5ta DECIMAL(4,2),
    IN p_id_usuario_creacion INT UNSIGNED,
    OUT p_id_parametro INT UNSIGNED
)
BEGIN
    DECLARE v_id_activo INT UNSIGNED;
    SET v_id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO' LIMIT 1);

    INSERT INTO RRHH_PLANILLA_PARAMETRO (
        ANIO, FECHA_VIGENCIA_DESDE, UIT, PORCENTAJE_ONP, PORCENTAJE_ESSALUD,
        APORTE_OBLIGATORIO_AFP_PORCENTAJE, PRIMA_SEGURO_AFP_PORCENTAJE, TOPE_ASEGURABLE_AFP,
        PORCENTAJE_RENTA_4TA, UMBRAL_RENTA_4TA, UIT_DEDUCCION_RENTA_5TA, ID_ESTADO, USUARIO_CREACION
    ) VALUES (
        p_anio, p_fecha_vigencia_desde, p_uit, p_porcentaje_onp, p_porcentaje_essalud,
        p_aporte_obligatorio_afp_porcentaje, p_prima_seguro_afp_porcentaje, p_tope_asegurable_afp,
        p_porcentaje_renta_4ta, p_umbral_renta_4ta, p_uit_deduccion_renta_5ta, v_id_activo, p_id_usuario_creacion
    );

    SET p_id_parametro = LAST_INSERT_ID();
END$$

CREATE PROCEDURE SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR(
    IN p_id_parametro INT UNSIGNED,
    IN p_desde_uit DECIMAL(6,2),
    IN p_hasta_uit DECIMAL(6,2),
    IN p_tasa DECIMAL(5,2),
    IN p_orden TINYINT UNSIGNED
)
BEGIN
    INSERT INTO RRHH_PLANILLA_PARAMETRO_TRAMO_RENTA5TA (ID_PARAMETRO, DESDE_UIT, HASTA_UIT, TASA, ORDEN)
    VALUES (p_id_parametro, p_desde_uit, p_hasta_uit, p_tasa, p_orden);
END$$

CREATE PROCEDURE SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_AGREGAR(
    IN p_id_parametro INT UNSIGNED,
    IN p_id_afp_fondo INT UNSIGNED,
    IN p_comision_porcentaje DECIMAL(5,2)
)
BEGIN
    INSERT INTO RRHH_PLANILLA_PARAMETRO_AFP_FONDO (ID_PARAMETRO, ID_AFP_FONDO, COMISION_PORCENTAJE)
    VALUES (p_id_parametro, p_id_afp_fondo, p_comision_porcentaje);
END$$

-- La version vigente a una fecha dada: la mas reciente cuya vigencia ya
-- empezo. p_fecha normalmente es HOY (calculo de la planilla en curso),
-- pero queda parametrizable para poder recalcular un mes pasado con las
-- tasas que regian en ese momento.
CREATE PROCEDURE SP_RRHH_PLANILLA_PARAMETRO_OBTENER_VIGENTE(
    IN p_fecha DATE
)
BEGIN
    SELECT pp.ID_PARAMETRO, pp.ANIO, pp.FECHA_VIGENCIA_DESDE, pp.UIT, pp.PORCENTAJE_ONP, pp.PORCENTAJE_ESSALUD,
           pp.APORTE_OBLIGATORIO_AFP_PORCENTAJE, pp.PRIMA_SEGURO_AFP_PORCENTAJE, pp.TOPE_ASEGURABLE_AFP,
           pp.PORCENTAJE_RENTA_4TA, pp.UMBRAL_RENTA_4TA, pp.UIT_DEDUCCION_RENTA_5TA
      FROM RRHH_PLANILLA_PARAMETRO pp
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pp.ID_ESTADO
     WHERE e.CODIGO = 'ACTIVO' AND pp.FECHA_VIGENCIA_DESDE <= p_fecha
     ORDER BY pp.FECHA_VIGENCIA_DESDE DESC, pp.ID_PARAMETRO DESC
     LIMIT 1;
END$$

CREATE PROCEDURE SP_RRHH_PLANILLA_PARAMETRO_TRAMO_LISTAR(
    IN p_id_parametro INT UNSIGNED
)
BEGIN
    SELECT ID_TRAMO, ID_PARAMETRO, DESDE_UIT, HASTA_UIT, TASA, ORDEN
      FROM RRHH_PLANILLA_PARAMETRO_TRAMO_RENTA5TA
     WHERE ID_PARAMETRO = p_id_parametro
     ORDER BY ORDEN;
END$$

CREATE PROCEDURE SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_LISTAR(
    IN p_id_parametro INT UNSIGNED
)
BEGIN
    SELECT af.ID_PARAMETRO_AFP_FONDO, af.ID_PARAMETRO, af.ID_AFP_FONDO,
           f.CODIGO AS AFP_FONDO_CODIGO, f.DESCRIPCION AS AFP_FONDO_DESCRIPCION, af.COMISION_PORCENTAJE
      FROM RRHH_PLANILLA_PARAMETRO_AFP_FONDO af
      JOIN MAESTRO_MAESTRO f ON f.ID_MAESTRO = af.ID_AFP_FONDO
     WHERE af.ID_PARAMETRO = p_id_parametro
     ORDER BY f.ORDEN;
END$$

-- Historial completo de versiones, para la pantalla de administracion
-- (mas reciente primero).
CREATE PROCEDURE SP_RRHH_PLANILLA_PARAMETRO_LISTAR()
BEGIN
    SELECT pp.ID_PARAMETRO, pp.ANIO, pp.FECHA_VIGENCIA_DESDE, pp.UIT, pp.PORCENTAJE_ONP, pp.PORCENTAJE_ESSALUD,
           pp.APORTE_OBLIGATORIO_AFP_PORCENTAJE, pp.PRIMA_SEGURO_AFP_PORCENTAJE, pp.TOPE_ASEGURABLE_AFP,
           pp.PORCENTAJE_RENTA_4TA, pp.UMBRAL_RENTA_4TA, pp.UIT_DEDUCCION_RENTA_5TA, pp.FECHA_CREACION
      FROM RRHH_PLANILLA_PARAMETRO pp
      JOIN MAESTRO_MAESTRO e ON e.ID_MAESTRO = pp.ID_ESTADO
     WHERE e.CODIGO = 'ACTIVO'
     ORDER BY pp.FECHA_VIGENCIA_DESDE DESC, pp.ID_PARAMETRO DESC;
END$$

DELIMITER ;
