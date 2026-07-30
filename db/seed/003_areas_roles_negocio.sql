-- =====================================================================
-- Areas de negocio pedidas originalmente (ADMINISTRACION, RRHH,
-- FACTURACION) con sus sub-roles Jefatura/Asistente. SUPER/SUPER_ADMIN
-- ya se sembro en 001_catalogos_base.sql.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO AREA (CODIGO, NOMBRE, ID_ESTADO, ORDEN) VALUES
    ('ADMINISTRACION', 'Administracion', @id_activo, 2),
    ('RRHH', 'Recursos Humanos', @id_activo, 3),
    ('FACTURACION', 'Facturacion', @id_activo, 4);

INSERT INTO ROL (ID_AREA, CODIGO, NOMBRE, NIVEL_JERARQUICO, ID_ESTADO, ORDEN)
SELECT a.ID_AREA, CONCAT(a.CODIGO, '_JEFATURA'), CONCAT('Jefatura de ', a.NOMBRE), 10, @id_activo, 1
  FROM AREA a WHERE a.CODIGO IN ('ADMINISTRACION', 'RRHH', 'FACTURACION');

INSERT INTO ROL (ID_AREA, CODIGO, NOMBRE, NIVEL_JERARQUICO, ID_ESTADO, ORDEN)
SELECT a.ID_AREA, CONCAT(a.CODIGO, '_ASISTENTE'), CONCAT('Asistente de ', a.NOMBRE), 50, @id_activo, 2
  FROM AREA a WHERE a.CODIGO IN ('ADMINISTRACION', 'RRHH', 'FACTURACION');

-- Horario laboral por defecto (Lun-Vie 08:00-18:00) para todos los roles
-- recien creados. Ajustable despues por area/rol desde /administracion.
INSERT INTO HORARIO_LABORAL (ID_ROL, ID_DIA_SEMANA, HORA_INICIO, HORA_FIN, ID_ESTADO)
SELECT r.ID_ROL, d.ID_MAESTRO, '08:00:00', '18:00:00', @id_activo
  FROM ROL r
  JOIN AREA a ON a.ID_AREA = r.ID_AREA AND a.CODIGO IN ('ADMINISTRACION', 'RRHH', 'FACTURACION')
  JOIN MAESTRO_MAESTRO d ON d.TIPO_MAESTRO = 'DIA_SEMANA' AND d.CODIGO IN ('LUN', 'MAR', 'MIE', 'JUE', 'VIE');
