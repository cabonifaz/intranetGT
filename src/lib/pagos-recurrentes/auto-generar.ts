import {
  listarPagosRecurrentes,
  listarInstancias,
  agregarInstancia,
  obtenerGeneracionDia,
  guardarGeneracionDia,
} from "@/lib/db/repositories/pago-recurrente.repository";
import { generarInstanciasPendientes } from "./generar-instancias";

// Se llama en cada request a una pantalla de Facturacion (ver
// facturacion/layout.tsx, junto a asegurarTipoCambioDelDia) -- no hay
// cron real en esta app, asi que "automatico" se logra dejando que el
// primer visitante del dia lo dispare. No-op inmediato si
// PAGO_RECURRENTE_GENERACION_DIA ya tiene la fecha de hoy (FECHA es su
// PK), asi que en la practica solo recorre los pagos recurrentes una vez
// por dia sin importar cuantas paginas se visiten.
//
// guardarGeneracionDia(hoy) se reserva ANTES de recorrer los pagos
// recurrentes (no al final) -- bug real encontrado en produccion: con el
// guardado al final, mientras el primer visitante del dia todavia estaba
// recorriendo los pagos recurrentes (varios roundtrips a la BD), CADA
// otro request concurrente a Facturacion volvia a entrar (la fila de hoy
// todavia no existia) y generaba su propia copia de las mismas
// instancias -- decenas de filas duplicadas del periodo actual.
// Reservando el dia primero, el resto de requests concurrentes salen de
// inmediato en el "if (existente) return" de arriba. UQ_PRI_PAGO_PERIODO
// (055_pago_recurrente_instancia_unique.sql) + el guard en
// SP_PAGO_RECURRENTE_INSTANCIA_AGREGAR cierran la ventana que todavia
// queda (la carrera entre ESTE chequeo y el guardado, igual de angosta
// que la que ya tolera SP_PAGO_RECURRENTE_GENERACION_DIA_GUARDAR).
//
// Contrapartida: si el proceso se cae a mitad del loop, el dia ya quedo
// marcado como generado y no se reintenta solo hasta la proxima visita
// del dia siguiente -- para eso sigue existiendo el boton "Generar
// instancias pendientes" del detalle de cada pago (fuerza un chequeo
// inmediato), mismo criterio que "Actualizar TC ahora" coexiste con el
// sync automatico.
export async function asegurarInstanciasGeneradasDelDia(): Promise<void> {
  const hoy = new Date().toISOString().slice(0, 10);
  const existente = await obtenerGeneracionDia(hoy);
  if (existente) return;

  await guardarGeneracionDia(hoy);

  const pagos = await listarPagosRecurrentes(true);

  for (const pago of pagos) {
    const instanciasActuales = await listarInstancias(pago.ID_PAGO_RECURRENTE);
    const montoSugerido = pago.ES_VARIABLE ? 0 : Number(pago.MONTO_FIJO ?? 0);

    const pendientes = generarInstanciasPendientes(
      pago.FECHA_INICIO,
      pago.FECHA_FIN,
      pago.INTERVALO_MESES,
      pago.DIA_VENCIMIENTO,
      instanciasActuales.map((i) => i.PERIODO),
    );

    for (const instancia of pendientes) {
      await agregarInstancia(pago.ID_PAGO_RECURRENTE, instancia.periodo, instancia.fechaVencimiento, montoSugerido, null, null);
    }
  }
}
