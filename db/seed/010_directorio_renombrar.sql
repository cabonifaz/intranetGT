-- =====================================================================
-- Renombra "Directorio de Empleados" -> "Directorio Corporativo": no es
-- solo de empleados, a futuro tambien aloja proveedores/socios
-- comerciales. Seguro de correr aunque ya hayas aplicado
-- 005_aplicacion_directorio.sql antes de este cambio (UPDATE simple, no
-- vuelve a llamar SP_APLICACION_CREAR).
-- =====================================================================

UPDATE APLICACION
   SET NOMBRE = 'Directorio Corporativo',
       DESCRIPCION = 'Contacto y datos de las personas de la empresa'
 WHERE CODIGO = 'RRHH_DIRECTORIO';
