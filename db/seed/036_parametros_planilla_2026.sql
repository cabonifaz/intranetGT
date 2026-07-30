-- =====================================================================
-- Primera version de parametros legales de planilla (2026). Valores
-- investigados al momento de construir el modulo (julio 2026):
--   - UIT 2026 = S/5,500 (D.S. 301-2025-EF).
--   - ONP = 13% flat, EsSalud = 9% flat (a cargo del empleador, no
--     descuenta el neto del colaborador).
--   - AFP: aporte obligatorio 10% + prima de seguro 1.37% (uniforme
--     entre fondos, Ley 32123 desde enero 2026) + comision por flujo,
--     que si varia por fondo (ver RRHH_PLANILLA_PARAMETRO_AFP_FONDO).
--   - Tope de remuneracion asegurable AFP (SBS, publicado trimestral):
--     S/12,672.65 para julio-setiembre 2026.
--   - Renta 4ta: retencion 8% si el recibo supera S/1,500.
--   - Renta 5ta: deduccion de 7 UIT anual, tramos progresivos estandar
--     (Art. 53 LIR): 8% hasta 5 UIT, 14% de 5 a 20 UIT, 17% de 20 a 35
--     UIT, 20% de 35 a 45 UIT, 30% de 45 UIT en adelante.
--
-- IMPORTANTE: estos valores son un punto de partida razonable, no una
-- fuente oficial verificada linea por linea. Antes de usar este modulo
-- para calcular un sueldo real, Finanzas/RRHH debe confirmarlos (y el
-- tope AFP en particular, que cambia cada trimestre) desde la pantalla
-- de administracion de parametros (/rrhh/planilla/parametros) y crear
-- una version nueva si algo no coincide con lo publicado por SUNAT/SBS/
-- la Asociacion de AFP.
-- =====================================================================

CALL SP_RRHH_PLANILLA_PARAMETRO_CREAR(
    2026, '2026-07-01',
    5500.00,           -- UIT
    13.00,              -- ONP
    9.00,               -- EsSalud
    10.00,              -- Aporte obligatorio AFP
    1.37,               -- Prima de seguro AFP
    12672.65,           -- Tope asegurable AFP (Q3 2026)
    8.00,               -- Renta 4ta
    1500.00,            -- Umbral Renta 4ta
    7.00,               -- UIT deduccion Renta 5ta
    NULL,
    @id_parametro_2026
);

CALL SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR(@id_parametro_2026, 0, 5, 8.00, 1);
CALL SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR(@id_parametro_2026, 5, 20, 14.00, 2);
CALL SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR(@id_parametro_2026, 20, 35, 17.00, 3);
CALL SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR(@id_parametro_2026, 35, 45, 20.00, 4);
CALL SP_RRHH_PLANILLA_PARAMETRO_TRAMO_AGREGAR(@id_parametro_2026, 45, NULL, 30.00, 5);

SET @id_afp_integra = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'AFP_FONDO' AND CODIGO = 'INTEGRA');
SET @id_afp_prima = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'AFP_FONDO' AND CODIGO = 'PRIMA');
SET @id_afp_profuturo = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'AFP_FONDO' AND CODIGO = 'PROFUTURO');
SET @id_afp_habitat = (SELECT ID_MAESTRO FROM MAESTRO_MAESTRO WHERE TIPO_MAESTRO = 'AFP_FONDO' AND CODIGO = 'HABITAT');

CALL SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_AGREGAR(@id_parametro_2026, @id_afp_integra, 1.55);
CALL SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_AGREGAR(@id_parametro_2026, @id_afp_prima, 1.60);
CALL SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_AGREGAR(@id_parametro_2026, @id_afp_profuturo, 1.69);
CALL SP_RRHH_PLANILLA_PARAMETRO_AFP_FONDO_AGREGAR(@id_parametro_2026, @id_afp_habitat, 1.47);
