-- =====================================================================
-- Area GERENCIA + rol GERENCIA_GENERAL (Gerente General / CEO). Se
-- necesita como CODIGO fijo porque el cierre de proyecto en codigo
-- (SP_PROYECTO_CAMBIAR_ESTADO / requireCierreProyecto) verifica este
-- ROL_CODIGO puntual, ademas de SUPER_ADMIN -- no basta con crear el rol
-- desde /administracion/roles con cualquier nombre.
-- =====================================================================

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO AREA (CODIGO, NOMBRE, ID_ESTADO, ORDEN) VALUES
    ('GERENCIA', 'Gerencia', @id_activo, 1);

SET @id_area_gerencia = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'GERENCIA');

INSERT INTO ROL (ID_AREA, CODIGO, NOMBRE, NIVEL_JERARQUICO, ID_ESTADO, ORDEN) VALUES
    (@id_area_gerencia, 'GERENCIA_GENERAL', 'Gerente General / CEO', 2, @id_activo, 1);

SET @id_rol_gerencia_general = (SELECT ID_ROL FROM ROL WHERE ID_AREA = @id_area_gerencia AND CODIGO = 'GERENCIA_GENERAL');

INSERT INTO HORARIO_LABORAL (ID_ROL, ID_DIA_SEMANA, HORA_INICIO, HORA_FIN, ID_ESTADO)
SELECT @id_rol_gerencia_general, m.ID_MAESTRO, '08:00:00', '18:00:00', @id_activo
  FROM MAESTRO_MAESTRO m
 WHERE m.TIPO_MAESTRO = 'DIA_SEMANA' AND m.CODIGO IN ('LUN', 'MAR', 'MIE', 'JUE', 'VIE');
