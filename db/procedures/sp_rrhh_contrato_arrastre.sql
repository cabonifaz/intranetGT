-- =====================================================================
-- Arrastre de un monto bruto "aplazado" hacia el periodo de un mes
-- futuro de un contrato (ver 049_rrhh_contrato_arrastre_pendiente.sql y
-- SP_RRHH_PLANILLA_DETALLE_APLAZAR en sp_rrhh_planilla.sql). Se consume
-- (y se borra) al generar ese periodo -- ver asegurarPeriodoDelMes en
-- src/lib/actions/rrhh-planilla.ts.
-- =====================================================================

DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_ARRASTRE_LISTAR;
DROP PROCEDURE IF EXISTS SP_RRHH_CONTRATO_ARRASTRE_ELIMINAR;

DELIMITER $$

CREATE PROCEDURE SP_RRHH_CONTRATO_ARRASTRE_LISTAR(
    IN p_id_contrato INT UNSIGNED
)
BEGIN
    SELECT ID_ARRASTRE, ID_CONTRATO, ANIO_DESTINO, MES_DESTINO, MONTO, FECHA_CREACION
      FROM RRHH_CONTRATO_ARRASTRE_PENDIENTE
     WHERE ID_CONTRATO = p_id_contrato
     ORDER BY ANIO_DESTINO, MES_DESTINO;
END$$

CREATE PROCEDURE SP_RRHH_CONTRATO_ARRASTRE_ELIMINAR(
    IN p_id_arrastre INT UNSIGNED
)
BEGIN
    DELETE FROM RRHH_CONTRATO_ARRASTRE_PENDIENTE WHERE ID_ARRASTRE = p_id_arrastre;
END$$

DELIMITER ;
