import {
  registrarMovimientoCuenta,
  obtenerIdTipoMovimientoIngreso,
  obtenerIdTipoMovimientoEgreso,
  obtenerCuentaPorTipo,
} from "@/lib/db/repositories/cuenta.repository";
import { presentarDeclaracion, obtenerIgvResultanteAnterior } from "@/lib/db/repositories/declaracion-tributaria.repository";
import type { TipoDeclaracionTributariaCodigo } from "@/types/db";

interface PresentarDeclaracionParams {
  idDeclaracion: number;
  tipoDeclaracionCodigo: TipoDeclaracionTributariaCodigo;
  mes: number;
  anio: number;
  igvResultante: number | null;
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
    const resultado = await acreditarDeltaIgvFavor(params, idUsuario);
    idMovimientoCredito = resultado.idMovimientoCredito;
    avisoSinCuenta = resultado.avisoSinCuenta;
  } else if (params.saldoRenta !== null && params.saldoRenta < 0) {
    // DJ Anual de Renta: a diferencia del IGV, NO rueda de un ejercicio al
    // siguiente -- cada año calcula su propio saldo de forma
    // independiente, asi que si genera saldo a favor se acredita
    // completo (no es un delta contra el año anterior).
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

// El IGV a favor es un saldo que RUEDA mes a mes -- cada PDT 621 ya neta
// el credito del periodo anterior contra el IGV del mes (si una
// constancia dice "saldo a favor S/ 500", ESE ya es el saldo acumulado
// vigente, no un credito nuevo de 500 sumado a lo anterior). Nunca se
// acredita el IGV_RESULTANTE bruto del mes -- solo el CAMBIO (delta)
// respecto al saldo del periodo anterior: si crecio, INGRESO del
// aumento; si se consumio (bajo, o el mes salio a pagar), EGRESO de lo
// consumido. Esto mantiene SALDO_ACTUAL de la cuenta IGV_FAVOR exacto y
// compatible con "Aplicar contra saldo a favor" (Cuentas, IGV pendiente
// de declarar de Proyectos), que depende de que ese saldo sea real.
//
// Caso real que motivo esto: presentar 9 meses seguidos acreditando cada
// IGV_RESULTANTE negativo completo registro S/105,228 en la cuenta
// cuando el saldo real (el del ultimo mes presentado, que ya salio a
// pagar) era S/0.
//
// Asume que las declaraciones se presentan en orden cronologico (como
// exige SUNAT en la practica) -- presentar fuera de orden puede dejar el
// delta de un periodo mal calculado hasta corregirlo a mano en Cuentas.
async function acreditarDeltaIgvFavor(
  params: PresentarDeclaracionParams,
  idUsuario: number,
): Promise<{ idMovimientoCredito: number | null; avisoSinCuenta?: string }> {
  const resultanteAnterior = await obtenerIgvResultanteAnterior(params.anio, params.mes);
  const creditoAnterior = resultanteAnterior !== null && resultanteAnterior < 0 ? Math.abs(resultanteAnterior) : 0;
  const creditoActual = params.igvResultante !== null && params.igvResultante < 0 ? Math.abs(params.igvResultante) : 0;
  const delta = creditoActual - creditoAnterior;

  if (delta === 0) return { idMovimientoCredito: null };

  const cuenta = await obtenerCuentaPorTipo("IGV_FAVOR");
  if (!cuenta) {
    return delta > 0
      ? { idMovimientoCredito: null, avisoSinCuenta: 'No se acredito el saldo a favor de IGV: no existe una cuenta de tipo "IGV a favor" en Cuentas. Crea esa cuenta y ajusta el saldo a mano si corresponde.' }
      : { idMovimientoCredito: null };
  }

  const periodoTexto = `${params.mes}/${params.anio}`;
  const idTipoMovimiento = delta > 0 ? await obtenerIdTipoMovimientoIngreso() : await obtenerIdTipoMovimientoEgreso();
  const movimiento = await registrarMovimientoCuenta({
    idCuenta: cuenta.ID_CUENTA,
    idTipoMovimiento,
    fechaMovimiento: new Date().toISOString().slice(0, 10),
    monto: Math.abs(delta),
    concepto: delta > 0 ? `Saldo a favor de IGV generado -- declaracion ${periodoTexto}` : `Saldo a favor de IGV consumido -- declaracion ${periodoTexto}`,
    tipoReferencia: "DECLARACION_TRIBUTARIA",
    idReferencia: params.idDeclaracion,
    idUsuarioCreacion: idUsuario,
  });

  return { idMovimientoCredito: delta > 0 ? movimiento.id_movimiento : null };
}
