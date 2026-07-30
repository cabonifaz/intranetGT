-- =====================================================================
-- Seed inicial de catalogos (MAESTRO_MAESTRO) + area/rol SUPER_ADMIN.
-- Aplicar una sola vez sobre un esquema recien creado (001-003).
-- =====================================================================

-- Bootstrap: la primera fila de MAESTRO_MAESTRO se autorreferencia como
-- su propio ID_ESTADO (no puede existir un estado "ACTIVO" previo a si
-- mismo). Es el unico lugar del sistema donde se fuerza un ID explicito.
SET FOREIGN_KEY_CHECKS = 0;
INSERT INTO MAESTRO_MAESTRO (ID_MAESTRO, TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO)
VALUES (1, 'ESTADO_GENERAL', 'ACTIVO', 'Activo', 1, 1);
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('ESTADO_GENERAL', 'INACTIVO', 'Inactivo', 2, 1);

SET @id_activo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'ESTADO_GENERAL' AND CODIGO = 'ACTIVO');

INSERT INTO MAESTRO_MAESTRO (TIPO_MAESTRO, CODIGO, DESCRIPCION, ORDEN, ID_ESTADO) VALUES
    ('ESTADO_USUARIO', 'ACTIVO', 'Activo', 1, @id_activo),
    ('ESTADO_USUARIO', 'BLOQUEADO', 'Bloqueado por intentos fallidos', 2, @id_activo),
    ('ESTADO_USUARIO', 'INACTIVO', 'Inactivo / dado de baja', 3, @id_activo),

    ('ESTADO_SESION', 'ACTIVA', 'Sesion activa', 1, @id_activo),
    ('ESTADO_SESION', 'CERRADA', 'Cerrada por el usuario (logout)', 2, @id_activo),
    ('ESTADO_SESION', 'EXPIRADA', 'Expirada por horario/inactividad', 3, @id_activo),
    ('ESTADO_SESION', 'CERRADA_FORZADA', 'Cerrada por un administrador u otra sesion', 4, @id_activo),

    ('DIA_SEMANA', 'LUN', 'Lunes', 1, @id_activo),
    ('DIA_SEMANA', 'MAR', 'Martes', 2, @id_activo),
    ('DIA_SEMANA', 'MIE', 'Miercoles', 3, @id_activo),
    ('DIA_SEMANA', 'JUE', 'Jueves', 4, @id_activo),
    ('DIA_SEMANA', 'VIE', 'Viernes', 5, @id_activo),
    ('DIA_SEMANA', 'SAB', 'Sabado', 6, @id_activo),
    ('DIA_SEMANA', 'DOM', 'Domingo', 7, @id_activo);

-- Area y rol base para el primer usuario administrador del sistema.
INSERT INTO AREA (CODIGO, NOMBRE, ID_ESTADO, ORDEN) VALUES
    ('SUPER', 'Super Usuarios', @id_activo, 1);

SET @id_area_super = (SELECT ID_AREA FROM AREA WHERE CODIGO = 'SUPER');

INSERT INTO ROL (ID_AREA, CODIGO, NOMBRE, NIVEL_JERARQUICO, ID_ESTADO, ORDEN) VALUES
    (@id_area_super, 'SUPER_ADMIN', 'Super Administrador', 1, @id_activo, 1);

SET @id_rol_super_admin = (SELECT ID_ROL FROM ROL WHERE ID_AREA = @id_area_super AND CODIGO = 'SUPER_ADMIN');

-- Horario laboral por defecto del rol SUPER_ADMIN: lunes a viernes 08:00-18:00.
-- Ajustar/complementar por area segun corresponda en fases siguientes.
INSERT INTO HORARIO_LABORAL (ID_ROL, ID_DIA_SEMANA, HORA_INICIO, HORA_FIN, ID_ESTADO)
SELECT @id_rol_super_admin, m.ID_MAESTRO, '08:00:00', '18:00:00', @id_activo
  FROM MAESTRO_MAESTRO m
 WHERE m.TIPO_MAESTRO = 'DIA_SEMANA' AND m.CODIGO IN ('LUN', 'MAR', 'MIE', 'JUE', 'VIE');
