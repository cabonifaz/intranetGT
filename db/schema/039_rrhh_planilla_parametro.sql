-- =====================================================================
-- Parametros legales de planilla (UIT, tasas AFP/ONP/EsSalud/Renta
-- 4ta-5ta) -- cambian cada año (UIT) o cada trimestre (tope asegurable
-- AFP, publicado por la SBS), asi que NO se hardcodean en codigo. Ledger
-- de solo insertar (nunca se actualiza una fila existente), mismo patron
-- que TIPO_CAMBIO_HISTORICO (032_tipo_cambio_categorias.sql): "vigente"
-- = la fila mas reciente cuya FECHA_VIGENCIA_DESDE ya paso. Corregir una
-- tasa es insertar una version nueva, no editar la anterior -- asi el
-- historico de que tasas se uso para calcular cada planilla queda
-- intacto (ver RRHH_PLANILLA_DETALLE.ID_PARAMETRO_APLICADO).
--
-- Las formulas de calculo viven en TypeScript (src/lib/rrhh/planilla/
-- calculo.ts), no aqui -- este archivo solo define donde se guardan los
-- numeros que esas formulas usan.
-- =====================================================================

CREATE TABLE RRHH_PLANILLA_PARAMETRO (
    ID_PARAMETRO                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ANIO                                 SMALLINT UNSIGNED NOT NULL,
    FECHA_VIGENCIA_DESDE                 DATE NOT NULL,
    UIT                                  DECIMAL(10,2) NOT NULL,
    PORCENTAJE_ONP                       DECIMAL(5,2) NOT NULL,
    PORCENTAJE_ESSALUD                   DECIMAL(5,2) NOT NULL,
    APORTE_OBLIGATORIO_AFP_PORCENTAJE    DECIMAL(5,2) NOT NULL,
    PRIMA_SEGURO_AFP_PORCENTAJE          DECIMAL(5,2) NOT NULL,
    TOPE_ASEGURABLE_AFP                  DECIMAL(10,2) NOT NULL,
    PORCENTAJE_RENTA_4TA                 DECIMAL(5,2) NOT NULL,
    UMBRAL_RENTA_4TA                     DECIMAL(10,2) NOT NULL,
    UIT_DEDUCCION_RENTA_5TA              DECIMAL(4,2) NOT NULL,
    ID_ESTADO                            INT UNSIGNED NOT NULL,
    USUARIO_CREACION                     INT UNSIGNED NULL,
    FECHA_CREACION                       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_PP_ESTADO FOREIGN KEY (ID_ESTADO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PP_VIGENCIA ON RRHH_PLANILLA_PARAMETRO (FECHA_VIGENCIA_DESDE);

-- Tramos progresivos de Renta 5ta (Art. 53 LIR): HASTA_UIT=NULL marca el
-- tramo sin tope (30% de 45 UIT en adelante).
CREATE TABLE RRHH_PLANILLA_PARAMETRO_TRAMO_RENTA5TA (
    ID_TRAMO         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_PARAMETRO     INT UNSIGNED NOT NULL,
    DESDE_UIT        DECIMAL(6,2) NOT NULL,
    HASTA_UIT        DECIMAL(6,2) NULL,
    TASA             DECIMAL(5,2) NOT NULL,
    ORDEN            TINYINT UNSIGNED NOT NULL,
    CONSTRAINT FK_PPT_PARAMETRO FOREIGN KEY (ID_PARAMETRO) REFERENCES RRHH_PLANILLA_PARAMETRO (ID_PARAMETRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PPT_PARAMETRO ON RRHH_PLANILLA_PARAMETRO_TRAMO_RENTA5TA (ID_PARAMETRO);

-- Comision por flujo de cada fondo AFP (INTEGRA/PRIMA/PROFUTURO/HABITAT)
-- para esta version de parametros -- la prima de seguro y el aporte
-- obligatorio son iguales para todos los fondos (columnas de arriba),
-- solo la comision varia por fondo.
CREATE TABLE RRHH_PLANILLA_PARAMETRO_AFP_FONDO (
    ID_PARAMETRO_AFP_FONDO   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ID_PARAMETRO             INT UNSIGNED NOT NULL,
    ID_AFP_FONDO             INT UNSIGNED NOT NULL,
    COMISION_PORCENTAJE      DECIMAL(5,2) NOT NULL,
    CONSTRAINT FK_PPAF_PARAMETRO FOREIGN KEY (ID_PARAMETRO) REFERENCES RRHH_PLANILLA_PARAMETRO (ID_PARAMETRO),
    CONSTRAINT FK_PPAF_FONDO FOREIGN KEY (ID_AFP_FONDO) REFERENCES MAESTRO_MAESTRO (ID_MAESTRO)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX IX_PPAF_PARAMETRO ON RRHH_PLANILLA_PARAMETRO_AFP_FONDO (ID_PARAMETRO);
