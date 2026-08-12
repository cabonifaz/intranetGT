-- =====================================================================
-- Reset de datos transaccionales / de prueba para dejar la BD lista
-- para produccion.
--
-- *** IRREVERSIBLE. Antes de correr esto: ***
--   1. Backup completo (ej. `mysqldump -u USER -p DB_NAME > backup.sql`).
--   2. Confirmar que estas conectado a la base de datos correcta (revisa
--      el nombre en la barra de conexion de DBeaver antes de ejecutar).
--   3. Correr TODO el archivo de una sola vez (no por partes) -- el
--      bloque de FOREIGN_KEY_CHECKS tiene que abrirse y cerrarse junto.
--
-- Que se mantiene intacto (decidido explicitamente, no por defecto):
--   - MAESTRO_MAESTRO, AREA, ROL, APLICACION, ROL_APLICACION_PERMISO
--     (catalogos y estructura de RBAC).
--   - USUARIO, USUARIO_ROL, RRHH_EMPLEADO, HORARIO_LABORAL (las cuentas
--     actuales ya son las personas reales que van a usar el sistema).
--   - CONFIGURACION_EMPRESA (logo de la empresa).
--   - RRHH_PLANILLA_PARAMETRO + _TRAMO_RENTA5TA + _AFP_FONDO (tasas
--     legales de planilla ya revisadas).
--   - CLIENTE, CLIENTE_CONTACTO, PROVEEDOR (ya son datos reales).
--   - CUENTA_EMPRESA (las cuentas bancarias reales de la empresa se
--     mantienen -- su SALDO_ACTUAL se reinicia a SALDO_INICIAL mas abajo,
--     ya que el historial de movimientos SI se borra).
--
-- Que se borra (transaccional y/o datos de prueba, segun lo conversado):
--   - Sesiones activas (SESION) y notificaciones.
--   - Todo el ciclo de Compras, Pasivos, Proyectos (con sus costos/
--     hitos/ingresos), Pagos Recurrentes.
--   - Todo el ciclo de Contratos de RRHH (incluidas las PLANTILLAS --
--     se pidio borrarlas tambien, no solo las instancias) y de Planilla
--     Mensual.
--   - Historial de tipo de cambio (se vuelve a poblar solo, ver
--     src/lib/facturacion/tipo-cambio-sunat.ts).
--   - Directorio de contactos externos (se pidio borrar, distinto de
--     CLIENTE_CONTACTO que si se mantiene).
--
-- Todas las tablas se vacian con TRUNCATE (mas rapido que DELETE y
-- reinicia los AUTO_INCREMENT a 1, ideal para arrancar produccion
-- limpia). FOREIGN_KEY_CHECKS se apaga durante el bloque porque hay
-- referencias cruzadas entre tablas que se truncan juntas (ej.
-- PASIVO_CUOTA.ID_MOVIMIENTO -> CUENTA_MOVIMIENTO) -- no hace falta
-- calcular el orden exacto de dependencias.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Sesiones y notificaciones
TRUNCATE TABLE NOTIFICACION_USUARIO;
TRUNCATE TABLE NOTIFICACION;
TRUNCATE TABLE SESION;

-- Cuentas: se mantiene CUENTA_EMPRESA, se borra su historial
TRUNCATE TABLE CUENTA_MOVIMIENTO;

-- Pasivos
TRUNCATE TABLE PASIVO_CUOTA;
TRUNCATE TABLE PASIVO;

-- Compras
TRUNCATE TABLE COMPRA_PAGO;
TRUNCATE TABLE COMPRA;

-- Pagos recurrentes
TRUNCATE TABLE PAGO_RECURRENTE_INSTANCIA;
TRUNCATE TABLE PAGO_RECURRENTE_GENERACION_DIA;
TRUNCATE TABLE PAGO_RECURRENTE;

-- Proyectos
TRUNCATE TABLE PROYECTO_COSTO_MANO_OBRA;
TRUNCATE TABLE PROYECTO_HITO;
TRUNCATE TABLE PROYECTO_INGRESO;
TRUNCATE TABLE PROYECTO;

-- Contratos de RRHH (incluye plantillas, segun lo conversado)
TRUNCATE TABLE RRHH_CONTRATO_HORAS;
TRUNCATE TABLE RRHH_CONTRATO_PROYECTO;
TRUNCATE TABLE RRHH_CONTRATO_PERIODO_PAGO;
TRUNCATE TABLE RRHH_CONTRATO_CONCEPTO;
TRUNCATE TABLE RRHH_CONTRATO;
TRUNCATE TABLE RRHH_CONTRATO_PLANTILLA_CLAUSULA;
TRUNCATE TABLE RRHH_CONTRATO_PLANTILLA;

-- Planilla Mensual (no se toca RRHH_PLANILLA_PARAMETRO ni sus hijos --
-- eso es configuracion de tasas, no transaccional)
TRUNCATE TABLE RRHH_PLANILLA_DETALLE_HORAS;
TRUNCATE TABLE RRHH_PLANILLA_DETALLE;
TRUNCATE TABLE RRHH_PLANILLA_MENSUAL;

-- Tipo de cambio
TRUNCATE TABLE TIPO_CAMBIO_HISTORICO;
TRUNCATE TABLE TIPO_CAMBIO_SUNAT_DIA;

-- Directorio de contactos externos (distinto de CLIENTE_CONTACTO)
TRUNCATE TABLE DIRECTORIO_CONTACTO_EXTERNO;

SET FOREIGN_KEY_CHECKS = 1;

-- Reinicia el saldo de las cuentas bancarias reales al saldo inicial
-- configurado, ya que su historial de movimientos se acaba de borrar.
UPDATE CUENTA_EMPRESA SET SALDO_ACTUAL = SALDO_INICIAL;

-- =====================================================================
-- Verificacion rapida: las de la izquierda deberian dar 0 filas, las de
-- la derecha deberian seguir mostrando tus datos reales.
-- =====================================================================
SELECT
    (SELECT COUNT(*) FROM PROYECTO)      AS proyectos_restantes,
    (SELECT COUNT(*) FROM RRHH_CONTRATO) AS contratos_restantes,
    (SELECT COUNT(*) FROM COMPRA)        AS compras_restantes,
    (SELECT COUNT(*) FROM PASIVO)        AS pasivos_restantes,
    (SELECT COUNT(*) FROM CUENTA_MOVIMIENTO) AS movimientos_restantes,
    (SELECT COUNT(*) FROM USUARIO)       AS usuarios_mantenidos,
    (SELECT COUNT(*) FROM CLIENTE)       AS clientes_mantenidos,
    (SELECT COUNT(*) FROM PROVEEDOR)     AS proveedores_mantenidos,
    (SELECT COUNT(*) FROM CUENTA_EMPRESA) AS cuentas_bancarias_mantenidas,
    (SELECT COUNT(*) FROM MAESTRO_MAESTRO) AS catalogos_mantenidos;
