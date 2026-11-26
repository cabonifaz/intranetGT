import {
  registrarMovimientoCuenta,
  obtenerIdTipoMovimientoIngreso,
  obtenerIdTipoMovimientoEgreso,
  obtenerCuentaPorTipo,
} from "@/lib/db/repositories/cuenta.repository";
import { presentarDeclaracion, obtenerIgvResultanteAnterior, obtenerRentaAnterior } from "@/lib/db/repositories/declaracion-tributaria.repository";
import type { TipoDeclaracionTributariaCodigo, TipoCuentaCodigo } from "@/types/db";

interface PresentarDeclaracionParams {
  idDeclaracion: number;
  tipoDeclaracionCodigo: TipoDeclaracionTributariaCodigo;
  mes: number;
  anio: number;
  igvResultante: number | null;
  pagoACuentaRenta: number | null;
  saldoRenta: number | null;
}

export interface ResultadoPresentarDeclaracion {
  avisoSinCuenta?: string;
}

// Logica compartida por presentarDeclaracionAction (boton manual) y la
// importacion por IA (ver api/facturacion/impuestos/importar/route.ts).
export async function presentarDeclaracionConCredito(params: PresentarDeclaracionParams, idUsuario: number): Promise<ResultadoPresentarDeclaracion> {
  let idMovimientoCredito: number | null = null;
  let avisoSinCuenta: string | undefined;

  if (params.tipoDeclaracionCodigo === "IGV_RENTA_MENSUAL") {
    const periodoTexto = `${params.mes}/${params.anio}`;
    const [igvAnterior, rentaAnterior] = await Promise.all([
      obtenerIgvResultanteAnterior(params.anio, params.mes),
      obtenerRentaAnterior(params.anio, params.mes),
    ]);

    // IGV y Renta (pago a cuenta) RUEDAN igual: el PDT 621 ya trae, para
    // cada tributo, "Impuesto Resultante" (bruto del mes), "Saldo a Favor
    // del Periodo anterior" y "Tributo a Pagar o Saldo a Favor" (el FINAL,
    // que es lo que se guarda en igvResultante/pagoACuentaRenta) -- asi
    // que ambos se acreditan/descuentan por DELTA contra su propio
    // periodo anterior, nunca por el monto bruto del mes.
    const resultadoIgv = await acreditarDelta(
      { idDeclaracion: params.idDeclaracion, periodoTexto, etiqueta: "IGV", tipoCuenta: "IGV_FAVOR", valorActual: params.igvResultante, valorAnterior: igvAnterior },
      idUsuario,
    );
    const resultadoRenta = await acreditarDelta(
      { idDeclaracion: params.idDeclaracion, periodoTexto, etiqueta: "Renta", tipoCuenta: "RENTA_FAVOR", valorActual: params.pagoACuentaRenta, valorAnterior: rentaAnterior },
      idUsuario,
    );

    // ID_MOVIMIENTO_CREDITO solo guarda UNA referencia -- si ambos
    // generaron credito nuevo el mismo mes (caso raro), se prioriza IGV;
    // el de Renta queda igual de trazable via tipoReferencia/idReferencia
    // en CUENTA_MOVIMIENTO, solo no queda enlazado desde este campo.
    idMovimientoCredito = resultadoIgv.idMovimientoCredito ?? resultadoRenta.idMovimientoCredito;
    avisoSinCuenta = [resultadoIgv.avisoSinCuenta, resultadoRenta.avisoSinCuenta].filter((a): a is string => Boolean(a)).join(" ") || undefined;
  } else if (params.saldoRenta !== null && params.saldoRenta < 0) {
    // DJ Anual de Renta: es la SEMILLA del credito de Renta (ver
    // SP_DECLARACION_TRIBUTARIA_RENTA_ANTERIOR) -- se acredita completo,
    // no por delta, porque no hay un "periodo anterior" dentro de la
    // misma DJ Anual contra el cual restar (cada ejercicio es su propio
    // calculo cerrado). Las mensuales del año siguiente ya la toman en
    // cuenta como su "anterior" y la van consumiendo por delta.
    const cuenta = await obtenerCuentaPorTipo("RENTA_FAVOR");
    if (cuenta) {
      const idTipoIngreso = await obtenerIdTipoMovimientoIngreso();
      const movimiento = await registrarMovimientoCuenta({
        idCuenta: cuenta.ID_CUENTA,
        idTipoMovimiento: idTipoIngreso,
        fechaMovimiento: new Date().toISOString().slice(0, 10),
        monto: Math.abs(params.saldoRenta),
        concepto: `Saldo a favor -- declaracion ${params.anio}`,
        tipoReferencia: "DECLARACION_TRIBUTARIA",
        idReferencia: params.idDeclaracion,
        idUsuarioCreacion: idUsuario,
      });
      idMovimientoCredito = movimiento.id_movimiento;
    } else {
      avisoSinCuenta = `No se acredito el saldo a favor: no existe una cuenta de tipo "Renta a favor" en Cuentas. Crea esa cuenta y ajusta el saldo a mano si corresponde.`;
    }
  }

  await presentarDeclaracion(params.idDeclaracion, idMovimientoCredito);
  return { avisoSinCuenta };
}

interface AcreditarDeltaParams {
  idDeclaracion: number;
  periodoTexto: string;
  etiqueta: "IGV" | "Renta";
  tipoCuenta: TipoCuentaCodigo;
  valorActual: number | null; // resultado FINAL del periodo (positivo = a pagar, negativo = a favor)
  valorAnterior: number | null; // resultado FINAL del periodo anterior, mismo criterio
}

// Core del rodado de saldo a favor: compara el resultado FINAL de este
// periodo contra el del periodo anterior y acredita/descuenta solo el
// CAMBIO -- nunca el monto bruto del mes. Mantiene SALDO_ACTUAL de
// IGV_FAVOR/RENTA_FAVOR exacto y compatible con "Aplicar contra saldo a
// favor" (Cuentas, IGV pendiente de declarar de Proyectos).
//
// Caso real que motivo esto: presentar 9 meses seguidos acreditando cada
// resultado bruto completo (en vez del delta) registro S/105,228 en la
// cuenta IGV a favor cuando el saldo real era muy distinto.
//
// Asume que las declaraciones se presentan en orden cronologico (como
// exige SUNAT en la practica) -- presentar fuera de orden puede dejar el
// delta de un periodo mal calculado hasta corregirlo a mano en Cuentas.
async function acreditarDelta(params: AcreditarDeltaParams, idUsuario: number): Promise<{ idMovimientoCredito: number | null; avisoSinCuenta?: string }> {
  const creditoAnterior = params.valorAnterior !== null && params.valorAnterior < 0 ? Math.abs(params.valorAnterior) : 0;
  const creditoActual = params.valorActual !== null && params.valorActual < 0 ? Math.abs(params.valorActual) : 0;
  const delta = creditoActual - creditoAnterior;

  if (delta === 0) return { idMovimientoCredito: null };

  const cuenta = await obtenerCuentaPorTipo(params.tipoCuenta);
  if (!cuenta) {
    return delta > 0
      ? {
          idMovimientoCredito: null,
          avisoSinCuenta: `No se acredito el saldo a favor de ${params.etiqueta}: no existe una cuenta de tipo "${params.tipoCuenta === "IGV_FAVOR" ? "IGV a favor" : "Renta a favor"}" en Cuentas. Crea esa cuenta y ajusta el saldo a mano si corresponde.`,
        }
      : { idMovimientoCredito: null };
  }

  const idTipoMovimiento = delta > 0 ? await obtenerIdTipoMovimientoIngreso() : await obtenerIdTipoMovimientoEgreso();
  const movimiento = await registrarMovimientoCuenta({
    idCuenta: cuenta.ID_CUENTA,
    idTipoMovimiento,
    fechaMovimiento: new Date().toISOString().slice(0, 10),
    monto: Math.abs(delta),
    concepto:
      delta > 0
        ? `Saldo a favor de ${params.etiqueta} generado -- declaracion ${params.periodoTexto}`
        : `Saldo a favor de ${params.etiqueta} consumido -- declaracion ${params.periodoTexto}`,
    tipoReferencia: "DECLARACION_TRIBUTARIA",
    idReferencia: params.idDeclaracion,
    idUsuarioCreacion: idUsuario,
  });

  return { idMovimientoCredito: delta > 0 ? movimiento.id_movimiento : null };
}
