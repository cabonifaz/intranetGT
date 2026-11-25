import { registrarMovimientoCuenta, obtenerIdTipoMovimientoIngreso, obtenerCuentaPorTipo } from "@/lib/db/repositories/cuenta.repository";
import { presentarDeclaracion } from "@/lib/db/repositories/declaracion-tributaria.repository";
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
// importacion por IA (ver api/facturacion/impuestos/importar/route.ts) --
// ambas caen en el mismo lugar: si el periodo genero saldo a favor
// (IGV_RESULTANTE < 0 en la mensual, SALDO_RENTA < 0 en la DJ anual), se
// acredita en la cuenta IGV_FAVOR/RENTA_FAVOR ANTES de pasar la
// declaracion a PRESENTADA -- mismo patron de dos pasos sin transaccion
// anidada que ya usa Pasivos.
export async function presentarDeclaracionConCredito(params: PresentarDeclaracionParams, idUsuario: number): Promise<ResultadoPresentarDeclaracion> {
  const esMensual = params.tipoDeclaracionCodigo === "IGV_RENTA_MENSUAL";
  const resultadoPeriodo = esMensual ? params.igvResultante : params.saldoRenta;

  let idMovimientoCredito: number | null = null;
  let avisoSinCuenta: string | undefined;

  if (resultadoPeriodo !== null && resultadoPeriodo < 0) {
    const codigoCuenta = esMensual ? "IGV_FAVOR" : "RENTA_FAVOR";
    const cuenta = await obtenerCuentaPorTipo(codigoCuenta);
    if (cuenta) {
      const idTipoIngreso = await obtenerIdTipoMovimientoIngreso();
      const periodoTexto = esMensual ? `${params.mes}/${params.anio}` : `${params.anio}`;
      const movimiento = await registrarMovimientoCuenta({
        idCuenta: cuenta.ID_CUENTA,
        idTipoMovimiento: idTipoIngreso,
        fechaMovimiento: new Date().toISOString().slice(0, 10),
        monto: Math.abs(resultadoPeriodo),
        concepto: `Saldo a favor -- declaracion ${periodoTexto}`,
        tipoReferencia: "DECLARACION_TRIBUTARIA",
        idReferencia: params.idDeclaracion,
        idUsuarioCreacion: idUsuario,
      });
      idMovimientoCredito = movimiento.id_movimiento;
    } else {
      avisoSinCuenta = `No se acredito el saldo a favor: no existe una cuenta de tipo "${codigoCuenta === "IGV_FAVOR" ? "IGV a favor" : "Renta a favor"}" en Cuentas. Crea esa cuenta y ajusta el saldo a mano si corresponde.`;
    }
  }

  await presentarDeclaracion(params.idDeclaracion, idMovimientoCredito);
  return { avisoSinCuenta };
}
