import type { CuotaPendienteRow } from "@/types/db";

export interface CuotaProyectada extends CuotaPendienteRow {
  saldoProyectado: number;
}

export interface GrupoCuenta {
  idCuenta: number | null;
  nombre: string;
  saldoActual: number | null;
  monedaCodigo: string | null;
  cuotas: CuotaProyectada[];
}

// Agrupa por cuenta de pago, ordena por vencimiento y va restando del
// saldo actual de la cuenta -- misma logica de "una sola consulta,
// calculo en la app" que ya se usa en las alertas de /rrhh/contratos.
// Compartido entre la pagina del plan de pagos y su descarga en PDF.
export function calcularProyeccion(cuotas: CuotaPendienteRow[]): GrupoCuenta[] {
  const grupos = new Map<number | null, GrupoCuenta>();

  for (const cuota of cuotas) {
    const clave = cuota.ID_CUENTA_PAGO;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        idCuenta: clave,
        nombre: cuota.CUENTA_PAGO_NOMBRE ?? "Sin cuenta asignada",
        saldoActual: cuota.CUENTA_SALDO_ACTUAL !== null ? Number(cuota.CUENTA_SALDO_ACTUAL) : null,
        monedaCodigo: cuota.CUENTA_MONEDA_CODIGO,
        cuotas: [],
      });
    }
    grupos.get(clave)!.cuotas.push({ ...cuota, saldoProyectado: 0 });
  }

  for (const grupo of grupos.values()) {
    grupo.cuotas.sort((a, b) => a.FECHA_VENCIMIENTO.localeCompare(b.FECHA_VENCIMIENTO));
    let saldo = grupo.saldoActual ?? 0;
    for (const cuota of grupo.cuotas) {
      saldo -= Number(cuota.MONTO);
      cuota.saldoProyectado = saldo;
    }
  }

  return Array.from(grupos.values()).sort((a, b) => {
    if (a.idCuenta === null) return 1;
    if (b.idCuenta === null) return -1;
    return a.nombre.localeCompare(b.nombre);
  });
}
