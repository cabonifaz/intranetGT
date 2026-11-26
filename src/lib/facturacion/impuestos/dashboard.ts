import type { DeclaracionTributariaListadoRow, EstadoDeclaracionTributariaCodigo } from "@/types/db";

// Todo el computo de este dashboard es agregacion de lectura (sumas,
// ratios, comparaciones) sobre filas que ya vienen calculadas por las SP
// -- a este volumen (unas pocas decenas de declaraciones por año) se trae
// TODO el historico una sola vez (listarDeclaraciones(null, null)) y se
// arma aqui en memoria, en vez de mantener varias SP de agregados que
// solo reempaquetarian los mismos montos. Ninguna regla de negocio nueva
// vive aca -- los montos y estados siguen viniendo 100% de la BD.

function numero(valor: string | null): number | null {
  return valor === null ? null : Number(valor);
}

export interface ResumenMensualImpuestos {
  mes: number; // 1-12
  existe: boolean;
  estadoCodigo: EstadoDeclaracionTributariaCodigo | null;
  ventasGravadas: number | null;
  comprasGravadas: number | null;
  igvVentas: number | null;
  igvCompras: number | null;
  igvResultante: number | null; // negativo = saldo a favor del periodo
  pagoACuentaRenta: number | null;
  tasaEfectivaPagoCuenta: number | null; // % sobre ventas gravadas -- para comparar contra el coeficiente/1.5% vigente
  fechaVencimiento: string | null;
  fechaPresentacion: string | null;
  presentadaTarde: boolean | null;
}

export interface ResumenAnualImpuestos {
  anio: number;
  mesesConDatos: number;
  totalVentasGravadas: number;
  totalComprasGravadas: number;
  totalIgvVentas: number;
  totalIgvCompras: number;
  totalIgvPagado: number; // suma de IGV_RESULTANTE positivos -- esto SI se suma (cada mes es un pago real distinto)
  totalPagoACuentaRenta: number;
  tasaEfectivaPromedioPagoCuenta: number | null;
  djAnual: {
    existe: boolean;
    estadoCodigo: EstadoDeclaracionTributariaCodigo | null;
    impuestoCalculadoRenta: number | null;
    pagosACuentaAcumulados: number | null;
    saldoRenta: number | null; // positivo = por regularizar, negativo = a favor del contribuyente
  };
  totalImpuestosPagados: number;
}

export interface AlertaDeclaracion {
  idDeclaracion: number;
  tipoDescripcion: string;
  periodoTexto: string;
  fechaVencimiento: string;
  diasDesdeVencimiento: number; // positivo = vencida, negativo = faltan dias
  tipo: "sin_presentar" | "sin_pagar";
  monto: number | null;
}

export interface ResumenImpuestos {
  aniosDisponibles: number[];
  anioSeleccionado: number;
  mensual: ResumenMensualImpuestos[];
  anual: ResumenAnualImpuestos;
  comparativoAnios: { anio: number; totalImpuestosPagados: number }[];
  vencidasSinPresentar: AlertaDeclaracion[];
  vencidasSinPagar: AlertaDeclaracion[];
  proximosVencimientos: AlertaDeclaracion[];
  // El IGV a favor es un saldo que RUEDA mes a mes -- cada PDT 621 ya neta
  // el credito del periodo anterior contra el IGV del mes, asi que NO se
  // suma a traves de los meses (eso sobreestima groseramente el saldo
  // real). Este es el saldo vigente HOY: el IGV_RESULTANTE (si es
  // negativo) de la ultima mensual presentada/pagada, sin importar el año
  // seleccionado -- mismo criterio que usa presentar-declaracion.ts para
  // acreditar/descontar por delta en Cuentas.
  igvFavorAlCorte: number;
  // Renta a favor NO rueda como el IGV (cada DJ Anual es un ejercicio
  // independiente), pero el saldo que genera la ultima DJ Anual
  // presentada/pagada sigue vigente hasta que se aplique o se devuelva --
  // igual que IGV, se muestra "al corte" (ultimo ejercicio declarado), no
  // solo cuando el año seleccionado coincide con el de esa DJ Anual.
  rentaFavorAlCorte: number;
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

function diasEntre(desde: string, hasta: Date): number {
  const fecha = new Date(`${desde}T00:00:00`);
  return Math.round((hasta.getTime() - fecha.getTime()) / 86400000);
}

function presentadaTarde(fechaPresentacion: string | null, fechaVencimiento: string): boolean | null {
  if (!fechaPresentacion) return null;
  const presentacion = new Date(fechaPresentacion).toISOString().slice(0, 10);
  return presentacion > fechaVencimiento;
}

export function construirResumenImpuestos(todas: DeclaracionTributariaListadoRow[], anioSeleccionado: number): ResumenImpuestos {
  const aniosDisponibles = [...new Set(todas.map((d) => d.ANIO))].sort((a, b) => b - a);

  const mensualesDelAnio = todas.filter((d) => d.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL" && d.ANIO === anioSeleccionado);
  const anualDelAnio = todas.find((d) => d.TIPO_DECLARACION_CODIGO === "DJ_ANUAL_RENTA" && d.ANIO === anioSeleccionado) ?? null;

  const mensual: ResumenMensualImpuestos[] = Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
    const fila = mensualesDelAnio.find((d) => d.MES === mes);
    if (!fila) {
      return {
        mes,
        existe: false,
        estadoCodigo: null,
        ventasGravadas: null,
        comprasGravadas: null,
        igvVentas: null,
        igvCompras: null,
        igvResultante: null,
        pagoACuentaRenta: null,
        tasaEfectivaPagoCuenta: null,
        fechaVencimiento: null,
        fechaPresentacion: null,
        presentadaTarde: null,
      };
    }
    const ventasGravadas = numero(fila.VENTAS_GRAVADAS);
    const pagoACuentaRenta = numero(fila.PAGO_A_CUENTA_RENTA);
    return {
      mes,
      existe: true,
      estadoCodigo: fila.ESTADO_DECLARACION_CODIGO,
      ventasGravadas,
      comprasGravadas: numero(fila.COMPRAS_GRAVADAS),
      igvVentas: numero(fila.IGV_VENTAS),
      igvCompras: numero(fila.IGV_COMPRAS),
      igvResultante: numero(fila.IGV_RESULTANTE),
      pagoACuentaRenta,
      tasaEfectivaPagoCuenta: ventasGravadas && ventasGravadas > 0 && pagoACuentaRenta !== null ? (pagoACuentaRenta / ventasGravadas) * 100 : null,
      fechaVencimiento: fila.FECHA_VENCIMIENTO,
      fechaPresentacion: fila.FECHA_PRESENTACION,
      presentadaTarde: presentadaTarde(fila.FECHA_PRESENTACION, fila.FECHA_VENCIMIENTO),
    };
  });

  const sumar = (campo: "ventasGravadas" | "comprasGravadas" | "igvVentas" | "igvCompras") => mensual.reduce((acc, m) => acc + (m[campo] ?? 0), 0);

  // pagoACuentaRenta ahora puede ser negativo (saldo a favor de Renta que
  // rueda, igual que el IGV) -- igual que totalIgvPagado, solo se suman
  // los meses donde realmente hubo que pagar, nunca los que quedaron a
  // favor (sumarlos tal cual entenderia de menos el pago real del año).
  const totalIgvPagado = mensual.reduce((acc, m) => acc + (m.igvResultante !== null && m.igvResultante > 0 ? m.igvResultante : 0), 0);
  const totalVentasGravadas = sumar("ventasGravadas");
  const totalPagoACuentaRenta = mensual.reduce((acc, m) => acc + (m.pagoACuentaRenta !== null && m.pagoACuentaRenta > 0 ? m.pagoACuentaRenta : 0), 0);
  const mesesConDatos = mensual.filter((m) => m.existe && m.ventasGravadas !== null).length;

  const impuestoCalculadoRenta = anualDelAnio ? numero(anualDelAnio.IMPUESTO_CALCULADO_RENTA) : null;
  const saldoRenta = anualDelAnio ? numero(anualDelAnio.SALDO_RENTA) : null;

  const anual: ResumenAnualImpuestos = {
    anio: anioSeleccionado,
    mesesConDatos,
    totalVentasGravadas,
    totalComprasGravadas: sumar("comprasGravadas"),
    totalIgvVentas: sumar("igvVentas"),
    totalIgvCompras: sumar("igvCompras"),
    totalIgvPagado,
    totalPagoACuentaRenta,
    tasaEfectivaPromedioPagoCuenta: totalVentasGravadas > 0 ? (totalPagoACuentaRenta / totalVentasGravadas) * 100 : null,
    djAnual: {
      existe: Boolean(anualDelAnio),
      estadoCodigo: anualDelAnio?.ESTADO_DECLARACION_CODIGO ?? null,
      impuestoCalculadoRenta,
      pagosACuentaAcumulados: anualDelAnio ? numero(anualDelAnio.PAGOS_A_CUENTA_ACUMULADOS) : null,
      saldoRenta,
    },
    totalImpuestosPagados: totalIgvPagado + totalPagoACuentaRenta + (saldoRenta !== null && saldoRenta > 0 ? saldoRenta : 0),
  };

  const comparativoAnios = aniosDisponibles
    .map((anio) => {
      const mensualesAnio = todas.filter((d) => d.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL" && d.ANIO === anio);
      const anualAnio = todas.find((d) => d.TIPO_DECLARACION_CODIGO === "DJ_ANUAL_RENTA" && d.ANIO === anio);
      const igvPagadoAnio = mensualesAnio.reduce((acc, d) => {
        const v = numero(d.IGV_RESULTANTE);
        return acc + (v !== null && v > 0 ? v : 0);
      }, 0);
      const pagoCuentaAnio = mensualesAnio.reduce((acc, d) => acc + (numero(d.PAGO_A_CUENTA_RENTA) ?? 0), 0);
      const saldoRentaAnio = anualAnio ? numero(anualAnio.SALDO_RENTA) : null;
      return {
        anio,
        totalImpuestosPagados: igvPagadoAnio + pagoCuentaAnio + (saldoRentaAnio !== null && saldoRentaAnio > 0 ? saldoRentaAnio : 0),
      };
    })
    .sort((a, b) => a.anio - b.anio);

  const hoy = new Date();
  const vencidasSinPresentar: AlertaDeclaracion[] = [];
  const vencidasSinPagar: AlertaDeclaracion[] = [];
  const proximosVencimientos: AlertaDeclaracion[] = [];

  for (const d of todas) {
    const periodoTexto = d.MES === 0 ? `${d.ANIO}` : `${MESES_CORTOS[d.MES - 1]} ${d.ANIO}`;
    const dias = diasEntre(d.FECHA_VENCIMIENTO, hoy);
    if (d.ESTADO_DECLARACION_CODIGO === "BORRADOR") {
      const alerta: AlertaDeclaracion = {
        idDeclaracion: d.ID_DECLARACION,
        tipoDescripcion: d.TIPO_DECLARACION_DESCRIPCION,
        periodoTexto,
        fechaVencimiento: d.FECHA_VENCIMIENTO,
        diasDesdeVencimiento: dias,
        tipo: "sin_presentar",
        monto: null,
      };
      if (dias > 0) vencidasSinPresentar.push(alerta);
      else if (dias >= -30) proximosVencimientos.push(alerta);
    } else if (d.ESTADO_DECLARACION_CODIGO === "PRESENTADA" && Number(d.MONTO_TOTAL_A_PAGAR) > 0) {
      const alerta: AlertaDeclaracion = {
        idDeclaracion: d.ID_DECLARACION,
        tipoDescripcion: d.TIPO_DECLARACION_DESCRIPCION,
        periodoTexto,
        fechaVencimiento: d.FECHA_VENCIMIENTO,
        diasDesdeVencimiento: dias,
        tipo: "sin_pagar",
        monto: Number(d.MONTO_TOTAL_A_PAGAR),
      };
      if (dias > 0) vencidasSinPagar.push(alerta);
      else if (dias >= -30) proximosVencimientos.push(alerta);
    }
  }

  vencidasSinPresentar.sort((a, b) => b.diasDesdeVencimiento - a.diasDesdeVencimiento);
  vencidasSinPagar.sort((a, b) => b.diasDesdeVencimiento - a.diasDesdeVencimiento);
  proximosVencimientos.sort((a, b) => a.diasDesdeVencimiento - b.diasDesdeVencimiento);

  // Saldo vigente HOY -- la mensual presentada/pagada mas reciente de
  // TODO el historico (el IGV a favor rueda entre años, no se reinicia
  // cada enero), sin importar el año seleccionado en el dashboard.
  const ultimaMensualPresentada = todas
    .filter((d) => d.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL" && (d.ESTADO_DECLARACION_CODIGO === "PRESENTADA" || d.ESTADO_DECLARACION_CODIGO === "PAGADA"))
    .sort((a, b) => b.ANIO * 12 + b.MES - (a.ANIO * 12 + a.MES))[0];
  const igvResultanteVigente = ultimaMensualPresentada ? numero(ultimaMensualPresentada.IGV_RESULTANTE) : null;
  const igvFavorAlCorte = igvResultanteVigente !== null && igvResultanteVigente < 0 ? Math.abs(igvResultanteVigente) : 0;

  // Renta (pago a cuenta) TAMBIEN rueda mes a mes, igual que el IGV (ver
  // presentar-declaracion.ts / SP_DECLARACION_TRIBUTARIA_RENTA_ANTERIOR)
  // -- prioridad: la mensual presentada/pagada mas reciente de TODO el
  // historico; si no hay ninguna, la DJ Anual mas reciente (la semilla
  // del credito, antes de que cualquier mensual lo empiece a consumir).
  const resultadoRentaVigente = ultimaMensualPresentada
    ? numero(ultimaMensualPresentada.PAGO_A_CUENTA_RENTA)
    : (todas
        .filter((d) => d.TIPO_DECLARACION_CODIGO === "DJ_ANUAL_RENTA" && (d.ESTADO_DECLARACION_CODIGO === "PRESENTADA" || d.ESTADO_DECLARACION_CODIGO === "PAGADA"))
        .sort((a, b) => b.ANIO - a.ANIO)
        .map((d) => numero(d.SALDO_RENTA))[0] ?? null);
  const rentaFavorAlCorte = resultadoRentaVigente !== null && resultadoRentaVigente < 0 ? Math.abs(resultadoRentaVigente) : 0;

  return {
    aniosDisponibles: aniosDisponibles.length > 0 ? aniosDisponibles : [anioSeleccionado],
    anioSeleccionado,
    mensual,
    anual,
    comparativoAnios,
    vencidasSinPresentar,
    vencidasSinPagar,
    proximosVencimientos,
    igvFavorAlCorte,
    rentaFavorAlCorte,
  };
}

export interface InsightContable {
  tono: "malo" | "alerta" | "info" | "bueno";
  texto: string;
}

function formatS(monto: number): string {
  return `S/ ${Math.abs(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Lectura en lenguaje llano de lo que ya esta en `resumen` -- cada
// insight se dispara solo si el numero que lo sustenta es significativo
// (evita ruido con diferencias de centimos o un solo mes atipico). No
// inventa cifras externas (UIT, tasas de multa, etc.) que no vivan en la
// BD -- cuando la recomendacion depende de eso, queda en terminos
// generales ("evalua con tu contador/SUNAT").
export function generarInsightsContables(resumen: ResumenImpuestos): InsightContable[] {
  const insights: InsightContable[] = [];
  const { anual, vencidasSinPresentar, vencidasSinPagar, mensual, anioSeleccionado, igvFavorAlCorte } = resumen;

  if (vencidasSinPresentar.length > 0) {
    insights.push({
      tono: "malo",
      texto: `Tienes ${vencidasSinPresentar.length} declaracion(es) vencida(s) sin presentar -- regularizalas cuanto antes, SUNAT aplica multa por extemporaneidad que crece mientras mas se demore.`,
    });
  }

  if (vencidasSinPagar.length > 0) {
    const montoTotal = vencidasSinPagar.reduce((acc, a) => acc + (a.monto ?? 0), 0);
    insights.push({
      tono: "malo",
      texto: `${vencidasSinPagar.length} declaracion(es) presentada(s) tienen el pago vencido (${formatS(montoTotal)} en total) -- generan interes moratorio diario mientras sigan sin pagarse.`,
    });
  }

  if (igvFavorAlCorte > 0 && anual.totalIgvPagado === 0) {
    insights.push({
      tono: "info",
      texto: `Tienes ${formatS(igvFavorAlCorte)} de saldo a favor de IGV vigente (segun la ultima mensual presentada) y no pagaste IGV en efectivo en ${anioSeleccionado} -- revisa en Cuentas (IGV a favor) si conviene aplicarlo contra el IGV pendiente de declarar de los proyectos en vez de dejarlo inmovilizado.`,
    });
  }

  if (anual.djAnual.existe && anual.djAnual.saldoRenta !== null && anual.djAnual.impuestoCalculadoRenta) {
    const pctDesfase = (Math.abs(anual.djAnual.saldoRenta) / anual.djAnual.impuestoCalculadoRenta) * 100;
    if (anual.djAnual.saldoRenta > 0 && pctDesfase > 5) {
      insights.push({
        tono: "alerta",
        texto: `La DJ Anual de Renta ${anioSeleccionado} arrojo ${formatS(anual.djAnual.saldoRenta)} por regularizar (${pctDesfase.toFixed(0)}% del impuesto calculado) -- los pagos a cuenta del año quedaron por debajo. Evalua con tu contador si conviene ajustar el coeficiente del proximo ejercicio para no arrastrar este desfase.`,
      });
    } else if (anual.djAnual.saldoRenta < 0 && pctDesfase > 5) {
      insights.push({
        tono: "info",
        texto: `La DJ Anual de Renta ${anioSeleccionado} genero ${formatS(anual.djAnual.saldoRenta)} a favor del contribuyente (${pctDesfase.toFixed(0)}% del impuesto calculado) -- los pagos a cuenta superaron el impuesto anual. Puedes compensarlo contra los pagos a cuenta del siguiente ejercicio en vez de dejarlo inmovilizado.`,
      });
    }
  }

  const mesesConTasa = mensual.filter((m) => m.tasaEfectivaPagoCuenta !== null);
  if (mesesConTasa.length >= 3) {
    const cercaDelMinimo = mesesConTasa.filter((m) => m.tasaEfectivaPagoCuenta! >= 1.3 && m.tasaEfectivaPagoCuenta! <= 1.7).length;
    if (cercaDelMinimo / mesesConTasa.length >= 0.7) {
      insights.push({
        tono: "info",
        texto: `La tasa efectiva de pago a cuenta de Renta ronda 1.5% en la mayoria de meses de ${anioSeleccionado} -- confirma con tu contador si corresponde el coeficiente del ejercicio anterior en vez del minimo legal, podria cambiar el monto del pago a cuenta mensual.`,
      });
    }
  }

  const mesesConVentas = mensual.filter((m) => m.ventasGravadas !== null);
  if (mesesConVentas.length >= 4) {
    const ultimo = mesesConVentas[mesesConVentas.length - 1];
    const anteriores = mesesConVentas.slice(0, -1);
    const promedioAnterior = anteriores.reduce((acc, m) => acc + m.ventasGravadas!, 0) / anteriores.length;
    if (promedioAnterior > 0) {
      const variacionPct = ((ultimo.ventasGravadas! - promedioAnterior) / promedioAnterior) * 100;
      if (Math.abs(variacionPct) >= 25) {
        insights.push({
          tono: variacionPct > 0 ? "bueno" : "alerta",
          texto: `Las ventas gravadas de ${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"][ultimo.mes - 1]} fueron ${variacionPct > 0 ? "" : "-"}${Math.abs(variacionPct).toFixed(0)}% ${variacionPct > 0 ? "mayores" : "menores"} que el promedio de los meses anteriores de ${anioSeleccionado}.`,
        });
      }
    }
  }

  if (insights.length === 0) {
    insights.push({ tono: "bueno", texto: "Sin alertas: las declaraciones del periodo estan al dia y sin desfases relevantes." });
  }

  return insights;
}
