-- =====================================================================
-- El directorio de empleados es navegable por cualquier usuario de la
-- intranet (piso LECTURA). RRHH conserva su ESCRITURA/ADMIN real, que
-- sigue prevaleciendo sobre el piso. Requiere 008_aplicacion_visible_todos.sql.
-- =====================================================================

UPDATE APLICACION SET VISIBLE_TODOS_LOS_ROLES = 1 WHERE CODIGO = 'RRHH_DIRECTORIO';
