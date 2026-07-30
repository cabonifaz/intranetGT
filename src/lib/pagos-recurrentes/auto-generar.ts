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
// por dia sin importar cuantas paginas se visiten. El boton "Generar
// instancias pendientes" del detalle de cada pago sigue existiendo para
// forzar un chequeo inmediato (ej. recien creado un pago nuevo), mismo
// criterio que "Actualizar TC ahora" coexiste con el sync automatico.
export async function asegurarInstanciasGeneradasDelDia(): Promise<void> {
  const hoy = new Date().toISOString().slice(0, 10);
  const existente = await obtenerGeneracionDia(hoy);
  if (existente) return;

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

  await guardarGeneracionDia(hoy);
}
