// Calculo de IGV/detraccion del Plan de facturacion -- puramente de
// visualizacion (no persiste nada, PROYECTO_HITO.MONTO sigue siendo la
// unica fuente de verdad), mismo criterio que calcularCosteo. Decisiones
// confirmadas con el usuario:
// - PROYECTO_HITO.MONTO/PROYECTO.INGRESO_ESPERADO son montos SIN IGV (base) --
//   el IGV se suma encima, no se extrae de un monto que ya lo incluye.
// - Tasa de IGV 18% y de detraccion 12% fijas para todo el sistema (sin
//   catalogo/campo por item -- Geeky Tech factura servicios, un solo
//   regimen).
// - La detraccion se calcula sobre el monto CON IGV (precio de venta),
//   no sobre la base -- asi lo define SUNAT.
// - La detraccion (y, para el consolidado de "IGV pendiente de declarar"
//   contra la cuenta IGV_FAVOR, tambien el IGV) SIEMPRE se maneja en
//   soles ante SUNAT, sin importar la moneda de facturacion del proyecto
//   -- si el proyecto esta en dolares, se convierte con el TC vigente de
//   Ventas (mismo TC que ya se usa para sugerir el TC de un ingreso
//   nuevo, ver obtenerTipoCambioVigente("VENTA")). Esto es una
//   referencia/estimado con el TC de hoy, no un valor fijado --
//   PROYECTO_HITO no guarda su propio TC (a diferencia de PROYECTO_INGRESO),
//   asi que fluctua si el TC cambia despues.
const TASA_IGV = 0.18;
const TASA_DETRACCION = 0.12;

function convertirASoles(monto: number, monedaCodigo: string, tcVenta: number | null): number | null {
  if (monedaCodigo === "PEN") return monto;
  return tcVenta !== null ? monto * tcVenta : null;
}

export interface ImpuestosItem {
  montoBase: number;
  igv: number;
  montoConIgv: number;
  detraccion: number; // en la moneda del proyecto (para el neto a cobrar)
  netoACobrar: number; // en la moneda del proyecto -- lo que transfiere el cliente a la cuenta normal
  detraccionSoles: number | null; // SIEMPRE en soles -- lo que se deposita ante SUNAT. null solo si el proyecto esta en USD y no hay TC vigente de Ventas para convertir.
}

export function calcularImpuestosItem(montoBase: number, monedaProyectoCodigo: string, tcVenta: number | null): ImpuestosItem {
  const igv = montoBase * TASA_IGV;
  const montoConIgv = montoBase + igv;
  const detraccion = montoConIgv * TASA_DETRACCION;
  const detraccionSoles = convertirASoles(detraccion, monedaProyectoCodigo, tcVenta);
  return { montoBase, igv, montoConIgv, detraccion, netoACobrar: montoConIgv - detraccion, detraccionSoles };
}

export interface ImpuestosProyecto {
  igvPorDeclarar: number; // en la moneda del proyecto
  detraccionPendienteSoles: number; // siempre en soles
}

interface HitoParaImpuestos {
  MONTO: string;
  ESTADO_HITO_CODIGO: string;
}

// IGV por declarar a SUNAT: se genera al facturar (nace la obligacion
// tributaria con el comprobante, no al cobrar) -- suma el IGV de items
// FACTURADO y COBRADO, en la moneda del proyecto (el IGV en si no tiene
// la regla de "siempre en soles" que si tiene la detraccion). Detraccion
// pendiente de deposito: solo mientras sigue FACTURADO -- una vez
// COBRADO se asume que la detraccion ya llego a la cuenta de
// detracciones (ver /facturacion/cuentas) -- siempre en soles. PLANEADO
// no suma a ninguno de los dos -- todavia no existe el comprobante.
export function calcularImpuestosProyecto(
  hitos: HitoParaImpuestos[],
  monedaProyectoCodigo: string,
  tcVenta: number | null,
): ImpuestosProyecto {
  return hitos.reduce<ImpuestosProyecto>(
    (acc, h) => {
      const item = calcularImpuestosItem(Number(h.MONTO), monedaProyectoCodigo, tcVenta);
      if (h.ESTADO_HITO_CODIGO === "FACTURADO" || h.ESTADO_HITO_CODIGO === "COBRADO") {
        acc.igvPorDeclarar += item.igv;
      }
      if (h.ESTADO_HITO_CODIGO === "FACTURADO") {
        acc.detraccionPendienteSoles += item.detraccionSoles ?? 0;
      }
      return acc;
    },
    { igvPorDeclarar: 0, detraccionPendienteSoles: 0 },
  );
}

export interface IgvConsolidado {
  igvTotalSoles: number;
  itemsSinConvertir: number; // items en USD que no se pudieron convertir por falta de TC vigente de Ventas -- no quedan incluidos en igvTotalSoles
}

interface HitoIgvConsolidado {
  MONTO: string;
  MONEDA_CODIGO: string;
}

// Consolidado CROSS-PROYECTO para la seccion "IGV pendiente de declarar"
// de la cuenta IGV_FAVOR (`/facturacion/cuentas/[id]`, SP_PROYECTO_HITO_LISTAR_IGV_PENDIENTE,
// ya filtrado a FACTURADO/COBRADO) -- a diferencia de calcularImpuestosProyecto
// (que deja el IGV en la moneda de UN proyecto, para verlo en su propio
// Costeo), esto SIEMPRE convierte a soles: se compara y se descuenta
// contra un saldo a favor compartido de toda la empresa que SUNAT exige
// en soles, igual que la detraccion.
export function calcularIgvConsolidado(hitos: HitoIgvConsolidado[], tcVenta: number | null): IgvConsolidado {
  return hitos.reduce<IgvConsolidado>(
    (acc, h) => {
      const igv = Number(h.MONTO) * TASA_IGV;
      const igvSoles = convertirASoles(igv, h.MONEDA_CODIGO, tcVenta);
      if (igvSoles === null) {
        acc.itemsSinConvertir += 1;
      } else {
        acc.igvTotalSoles += igvSoles;
      }
      return acc;
    },
    { igvTotalSoles: 0, itemsSinConvertir: 0 },
  );
}
