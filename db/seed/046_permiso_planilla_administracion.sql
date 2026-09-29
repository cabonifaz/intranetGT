-- =====================================================================
-- ADMINISTRACION_JEFATURA (Jefatura de Administracion) pasa de LECTURA a
-- ESCRITURA sobre RRHH_PLANILLA -- puede generar/gestionar la planilla
-- mensual, no solo verla. Mismo criterio que
-- 043_permiso_contratos_administracion.sql. Decision de negocio del
-- 2026-09-29 (Alfredo Villar, Jefatura de Administracion, necesitaba
-- generar la planilla del mes y el sistema lo redirigia por no tener
-- ESCRITURA).
-- =====================================================================

SET @id_rol_admin_jefatura = (SELECT ID_ROL FROM ROL WHERE CODIGO = 'ADMINISTRACION_JEFATURA');
SET @id_app_planilla = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'RRHH_PLANILLA');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR(@id_rol_admin_jefatura, @id_app_planilla, @id_nivel_escritura);
