-- Conformidad con N firmantes: el negocio pidio poder pedirle la firma a
-- varias personas por la MISMA conformidad (no 1 documento por persona),
-- cada una identificada por nombre, cada una con su propio link de firma
-- -- y la conformidad no cuenta como completa (no desbloquea facturar el
-- hito, ver SP_PROYECTO_HITO_MARCAR_FACTURADO en sp_proyecto.sql) hasta
-- que TODOS sus firmantes hayan firmado. Tambien debe ser facil agregar o
-- quitar un firmante en pleno proceso (ej. "ya no hace falta que firme
-- fulano").
--
-- Antes (050_proyecto_conformidad.sql) la firma era 1 sola, con sus
-- columnas (FIRMA_PNG_PATH, FECHA_FIRMA, USUARIO_FIRMA_REGISTRO,
-- TOKEN_FIRMA, TOKEN_EXPIRA) viviendo directo en PROYECTO_CONFORMIDAD.
-- Esas columnas NO se borran (evitar un ALTER...DROP destructivo sobre
-- una tabla con filas reales de produccion ya firmadas) pero quedan en
-- desuso desde ahora -- el codigo nuevo ya no las lee ni las escribe, la
-- firma vive exclusivamente en esta tabla hija, 1 fila por firmante.
-- DOCUMENTO_PATH/DOCUMENTO_FIRMADO_PATH en PROYECTO_CONFORMIDAD si
-- siguen en uso: son el PDF completo (items + TODAS las firmas
-- recolectadas hasta el momento, firmantes pendientes salen en blanco),
-- se regenera cada vez que firma alguien.
CREATE TABLE IF NOT EXISTS PROYECTO_CONFORMIDAD_FIRMANTE (
    ID_FIRMANTE              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_CONFORMIDAD           INT UNSIGNED NOT NULL,
    NOMBRE                   VARCHAR(150) NOT NULL,
    CARGO                    VARCHAR(150) NULL,
    ORDEN                    INT NOT NULL DEFAULT 0,
    -- FIRMA_PNG_PATH: el trazo de firma capturado por el link publico
    -- (dibujo o foto normalizada a PNG), se incrusta en el PDF combinado.
    -- DOCUMENTO_FIRMADO_INDIVIDUAL_PATH: para la alternativa manual --
    -- el gestor sube el documento ya firmado en papel de ESTE firmante
    -- puntual (puede ser PDF/PNG/JPG, no necesariamente una imagen de
    -- firma incrustable) -- queda como evidencia descargable aparte, no
    -- se intenta incrustar en el PDF combinado.
    FIRMA_PNG_PATH           VARCHAR(300) NULL,
    DOCUMENTO_FIRMADO_INDIVIDUAL_PATH VARCHAR(300) NULL,
    FECHA_FIRMA              DATETIME NULL,
    USUARIO_FIRMA_REGISTRO   INT UNSIGNED NULL,
    TOKEN_FIRMA              CHAR(36) NULL,
    TOKEN_EXPIRA             DATETIME NULL,
    USUARIO_CREACION         INT UNSIGNED NULL,
    FECHA_CREACION           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FECHA_MODIFICACION       DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_CONFORMIDAD_FIRMANTE_CONFORMIDAD FOREIGN KEY (ID_CONFORMIDAD) REFERENCES PROYECTO_CONFORMIDAD (ID_CONFORMIDAD),
    CONSTRAINT UQ_CONFORMIDAD_FIRMANTE_TOKEN UNIQUE (TOKEN_FIRMA)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_CONFORMIDAD_FIRMANTE_CONFORMIDAD ON PROYECTO_CONFORMIDAD_FIRMANTE (ID_CONFORMIDAD, ORDEN);

-- Migra a firmantes las conformidades que ya estaban FIRMADAS bajo el
-- modelo viejo (1 firma por conformidad) -- asi el codigo nuevo no
-- necesita 2 caminos distintos (legacy de 1 firma vs. N firmantes). El
-- nombre impreso en el PDF viejo era la razon social del cliente (ver
-- generar-conformidad-pdf.ts, nombre: clienteRazonSocial), no el de una
-- persona puntual -- se preserva tal cual como firmante #1; el gestor
-- puede renombrarlo despues desde la pantalla si corresponde.
INSERT INTO PROYECTO_CONFORMIDAD_FIRMANTE (ID_CONFORMIDAD, NOMBRE, ORDEN, FIRMA_PNG_PATH, FECHA_FIRMA, USUARIO_FIRMA_REGISTRO, USUARIO_CREACION)
SELECT pc.ID_CONFORMIDAD, COALESCE(cl.RAZON_SOCIAL, 'Cliente'), 0, pc.FIRMA_PNG_PATH, pc.FECHA_FIRMA, pc.USUARIO_FIRMA_REGISTRO, pc.USUARIO_CREACION
  FROM PROYECTO_CONFORMIDAD pc
  JOIN PROYECTO p ON p.ID_PROYECTO = pc.ID_PROYECTO
  LEFT JOIN CLIENTE cl ON cl.ID_CLIENTE = p.ID_CLIENTE
 WHERE pc.FECHA_FIRMA IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM PROYECTO_CONFORMIDAD_FIRMANTE f WHERE f.ID_CONFORMIDAD = pc.ID_CONFORMIDAD);
