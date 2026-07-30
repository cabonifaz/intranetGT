// Formulas de calculo de descuentos/retenciones legales de planilla --
// puras, sin IO, testeables. Todas reciben ParametrosPlanillaVigentes,
// nada de tasas hardcodeadas aca (ver parametros.ts para como se arma
// ese objeto desde RRHH_PLANILLA_PARAMETRO).
//
// Alcance v1 (ver plan): Renta 5ta usa una proyeccion anual recalculada
// cada mes a partir de lo ya acumulado en RRHH_PLANILLA_DETALLE -- fiel
// a la forma de la formula de SUNAT (7 UIT de deduccion + tramos
// progresivos) pero sin los checkpoints especificos de junio/julio y
// noviembre/diciembre del Art. 40 del Reglamento de la LIR, y sin
// gratificaciones (no existe ese concepto remunerativo hoy). El monto
// bruto se asume ya en soles -- este modulo no convierte moneda.

export interface TramoRenta5ta {
  desdeUit: number;
  hastaUit: number | null;
  tasa: number;
}

export interface ParametrosPlanillaVigentes {
  idParametro: number;
  uit: number;
  porcentajeOnp: number;
  porcentajeEssalud: number;
  aporteObligatorioAfpPorcentaje: number;
  primaSeguroAfpPorcentaje: number;
  topeAsegurableAfp: number;
  porcentajeRenta4ta: number;
  umbralRenta4ta: number;
  uitDeduccionRenta5ta: number;
  tramosRenta5ta: TramoRenta5ta[];
  comisionesAfpPorFondo: Record<string, number>;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export interface ResultadoAportePension {
  monto: number;
  detalle: {
    aporteObligatorio?: number;
    comisionAfp?: number;
    primaSeguro?: number;
    onp?: number;
  };
}

// AFP: aporte obligatorio + comision del fondo elegido + prima de
// seguro, todos calculados sobre la remuneracion topada al maximo
// asegurable (SBS). ONP: 13% flat, sin tope. afpFondoCodigo debe venir
// informado si sistemaPension="AFP" -- si no hay comision configurada
// para ese fondo en parametros, se asume 0 (no bloquea el calculo, pero
// el resultado quedaria incompleto -- la UI debe avisar si falta).
export function calcularAportePension(
  remuneracionBruta: number,
  sistemaPension: "AFP" | "ONP",
  afpFondoCodigo: string | null,
  parametros: ParametrosPlanillaVigentes,
): ResultadoAportePension {
  if (sistemaPension === "ONP") {
    const onp = redondear(remuneracionBruta * (parametros.porcentajeOnp / 100));
    return { monto: onp, detalle: { onp } };
  }

  const baseAsegurable = Math.min(remuneracionBruta, parametros.topeAsegurableAfp);
  const comisionPorcentaje = afpFondoCodigo ? (parametros.comisionesAfpPorFondo[afpFondoCodigo] ?? 0) : 0;

  const aporteObligatorio = redondear(baseAsegurable * (parametros.aporteObligatorioAfpPorcentaje / 100));
  const primaSeguro = redondear(baseAsegurable * (parametros.primaSeguroAfpPorcentaje / 100));
  const comisionAfp = redondear(baseAsegurable * (comisionPorcentaje / 100));

  return {
    monto: redondear(aporteObligatorio + primaSeguro + comisionAfp),
    detalle: { aporteObligatorio, primaSeguro, comisionAfp },
  };
}

// EsSalud: costo del EMPLEADOR sobre la remuneracion -- no se descuenta
// del neto del colaborador (ver calcularBoletaPlanilla).
export function calcularEssalud(remuneracionBruta: number, parametros: ParametrosPlanillaVigentes): number {
  return redondear(remuneracionBruta * (parametros.porcentajeEssalud / 100));
}

// Renta 4ta: 8% del recibo si supera el umbral SUNAT, salvo que el
// locador tenga una suspension de retenciones vigente.
export function calcularRetencionRenta4ta(montoRecibo: number, tieneSuspension: boolean, parametros: ParametrosPlanillaVigentes): number {
  if (tieneSuspension) return 0;
  if (montoRecibo <= parametros.umbralRenta4ta) return 0;
  return redondear(montoRecibo * (parametros.porcentajeRenta4ta / 100));
}

function aplicarTramosProgresivos(montoAnual: number, uit: number, tramos: TramoRenta5ta[]): number {
  let impuesto = 0;
  for (const tramo of tramos) {
    const desde = tramo.desdeUit * uit;
    const hasta = tramo.hastaUit !== null ? tramo.hastaUit * uit : Infinity;
    if (montoAnual <= desde) continue;
    const baseTramo = Math.min(montoAnual, hasta) - desde;
    if (baseTramo <= 0) continue;
    impuesto += baseTramo * (tramo.tasa / 100);
  }
  return impuesto;
}

export interface EntradaRenta5ta {
  remuneracionBrutaMensualActual: number;
  mesesRestantesIncluyendoActual: number;
  brutoAcumuladoMesesAnterioresDelAnio: number;
  retencionesAcumuladasAnioActual: number;
  parametros: ParametrosPlanillaVigentes;
}

export interface ResultadoRenta5ta {
  rentaAnualProyectada: number;
  impuestoAnualProyectado: number;
  retencionMes: number;
}

// Proyeccion anual recalculada cada mes: (bruto del mes x meses
// restantes incluyendo el actual) + lo ya ganado en meses previos del
// año, menos 7 UIT de deduccion; tramos progresivos sobre eso da el
// impuesto anual proyectado; la retencion del mes es lo que falta
// retener para llegar a ese impuesto (impuesto proyectado - lo ya
// retenido este año), repartido entre los meses que quedan. Nunca
// negativa (un mes con bono puntual no genera "devolucion" aca).
export function calcularRenta5taMensual(entrada: EntradaRenta5ta): ResultadoRenta5ta {
  const { remuneracionBrutaMensualActual, mesesRestantesIncluyendoActual, brutoAcumuladoMesesAnterioresDelAnio, retencionesAcumuladasAnioActual, parametros } =
    entrada;

  const proyeccionAnual = remuneracionBrutaMensualActual * mesesRestantesIncluyendoActual + brutoAcumuladoMesesAnterioresDelAnio;
  const deduccion = parametros.uitDeduccionRenta5ta * parametros.uit;
  const rentaAnualProyectada = Math.max(0, proyeccionAnual - deduccion);

  const impuestoAnualProyectado = redondear(aplicarTramosProgresivos(rentaAnualProyectada, parametros.uit, parametros.tramosRenta5ta));

  const retencionMes = redondear(Math.max(0, (impuestoAnualProyectado - retencionesAcumuladasAnioActual) / mesesRestantesIncluyendoActual));

  return { rentaAnualProyectada: redondear(rentaAnualProyectada), impuestoAnualProyectado, retencionMes };
}

export interface ResultadoBoletaPlanilla {
  bruto: number;
  aportePension: number;
  retencionRenta: number;
  essalud: number;
  neto: number;
}

// Boleta de pago (PLANILLA, 5ta categoria). EsSalud se calcula e informa
// pero NO resta el neto -- es un costo del empleador, no un descuento
// del trabajador.
export function calcularBoletaPlanilla(input: {
  remuneracionBruta: number;
  sistemaPension: "AFP" | "ONP" | null;
  afpFondoCodigo: string | null;
  mesesRestantesIncluyendoActual: number;
  brutoAcumuladoMesesAnterioresDelAnio: number;
  retencionesAcumuladasAnioActual: number;
  parametros: ParametrosPlanillaVigentes;
}): ResultadoBoletaPlanilla {
  const aportePension = input.sistemaPension
    ? calcularAportePension(input.remuneracionBruta, input.sistemaPension, input.afpFondoCodigo, input.parametros).monto
    : 0;
  const essalud = calcularEssalud(input.remuneracionBruta, input.parametros);
  const { retencionMes } = calcularRenta5taMensual({
    remuneracionBrutaMensualActual: input.remuneracionBruta,
    mesesRestantesIncluyendoActual: input.mesesRestantesIncluyendoActual,
    brutoAcumuladoMesesAnterioresDelAnio: input.brutoAcumuladoMesesAnterioresDelAnio,
    retencionesAcumuladasAnioActual: input.retencionesAcumuladasAnioActual,
    parametros: input.parametros,
  });

  return {
    bruto: redondear(input.remuneracionBruta),
    aportePension,
    retencionRenta: retencionMes,
    essalud,
    neto: redondear(input.remuneracionBruta - aportePension - retencionMes),
  };
}

export interface ResultadoRxH {
  bruto: number;
  retencionRenta: number;
  neto: number;
}

// Recibo por honorarios (LOCADOR, 4ta categoria).
export function calcularRxH(input: { montoRecibo: number; tieneSuspension: boolean; parametros: ParametrosPlanillaVigentes }): ResultadoRxH {
  const retencionRenta = calcularRetencionRenta4ta(input.montoRecibo, input.tieneSuspension, input.parametros);
  return {
    bruto: redondear(input.montoRecibo),
    retencionRenta,
    neto: redondear(input.montoRecibo - retencionRenta),
  };
}
