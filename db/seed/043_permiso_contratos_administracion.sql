-- =====================================================================
-- ADMINISTRACION_JEFATURA (Jefatura de Administracion) pasa de LECTURA a
-- ESCRITURA sobre RRHH_CONTRATOS -- puede crear/gestionar contratos, no
-- solo verlos desde la ficha del colaborador (041_permisos_gerencia_
-- ficha.sql le habia dado solo LECTURA). Decision de negocio del
-- 2026-09-22 (Alfredo Villar, Jefatura de Administracion, necesitaba
-- crear un contrato y el sistema lo redirigia por no tener ESCRITURA).
-- =====================================================================

SET @id_rol_admin_jefatura = (SELECT ID_ROL FROM ROL WHERE CODIGO = 'ADMINISTRACION_JEFATURA');
SET @id_app_contratos = (SELECT ID_APLICACION FROM APLICACION WHERE CODIGO = 'RRHH_CONTRATOS');
SET @id_nivel_escritura = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'NIVEL_PERMISO' AND CODIGO = 'ESCRITURA');

CALL SP_ROL_APLICACION_PERMISO_ASIGNAR(@id_rol_admin_jefatura, @id_app_contratos, @id_nivel_escritura);
