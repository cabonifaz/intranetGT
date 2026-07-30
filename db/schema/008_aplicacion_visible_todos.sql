-- =====================================================================
-- 008_aplicacion_visible_todos.sql
-- Bandera reutilizable: una APLICACION marcada VISIBLE_TODOS_LOS_ROLES=1
-- es visible con piso LECTURA para CUALQUIER usuario, sin importar si su
-- rol tiene una fila en ROL_APLICACION_PERMISO. El nivel real (si es
-- mayor, ej. RRHH con ESCRITURA/ADMIN) siempre prevalece sobre el piso.
-- Pensada para apps tipo "directorio de la empresa": todos navegan,
-- pero el nivel de detalle que ven se resuelve aparte (ver
-- src/lib/rrhh/visibilidad-directorio.ts).
-- =====================================================================

ALTER TABLE APLICACION
    ADD COLUMN VISIBLE_TODOS_LOS_ROLES TINYINT(1) NOT NULL DEFAULT 0 AFTER REQUIERE_SSO;
