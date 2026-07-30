-- =====================================================================
-- Fila singleton de configuracion de empresa (logo, sin logo por defecto).
-- =====================================================================

INSERT INTO CONFIGURACION_EMPRESA (ID_CONFIGURACION)
VALUES (1)
ON DUPLICATE KEY UPDATE ID_CONFIGURACION = ID_CONFIGURACION;
