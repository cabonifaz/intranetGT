-- =====================================================================
-- GERENCIA_GENERAL y ADMINISTRACION_JEFATURA pueden ver, en la ficha de
-- cualquier colaborador (puedeVerResumenGerencialFicha), sus prestamos/
-- adelantos, sus contratos y la alerta de vencimiento -- para que el
-- link a cada detalle no los rebote, necesitan LECTURA real sobre
-- RRHH_CONTRATOS y RRHH_PLANILLA (SUPER_ADMIN ya la tiene via el
-- auto-grant de SP_APLICACION_CREAR). Solo LECTURA -- crear/editar sigue
-- reservado a RRHH.
-- =====================================================================

SET @id_nivel_lectura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'LECTURA');
SET @id_app_contratos = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'RRHH_CONTRATOS');
SET @id_app_planilla = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'RRHH_PLANILLA');
SET @id_rol_gerencia_general = (SELECT ID_ROL FROM ROL WHERE CODIGO = 'GERENCIA_GENERAL');
SET @id_rol_administracion_jefatura = (SELECT ID_ROL FROM ROL WHERE CODIGO = 'ADMINISTRACION_JEFATURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR(@id_rol_gerencia_general, @id_app_contratos, @id_nivel_lectura);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR(@id_rol_gerencia_general, @id_app_planilla, @id_nivel_lectura);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR(@id_rol_administracion_jefatura, @id_app_contratos, @id_nivel_lectura);
CALL SP_ROL_APLICACION_PERMISO_ASIGNAR(@id_rol_administracion_jefatura, @id_app_planilla, @id_nivel_lectura);
