import { NextResponse, type NextRequest } from "next/server";
import { generarPlanillaMensual } from "@/lib/actions/rrhh-planilla";

// Corre a diario (mismo criterio que /api/cron/contratos-por-vencer) para
// que nadie tenga que acordarse de tocar "Generar planilla del mes" --
// hace exactamente lo mismo que ese boton (crea/actualiza el borrador del
// mes en curso con los colaboradores nuevos o corregidos), nunca emite ni
// marca nada como pagado -- eso lo sigue haciendo una persona revisando
// el checklist de /rrhh/planilla/[id]. idUsuario null: no hay sesion, las
// columnas de auditoria correspondientes son nullable.
//   curl -H "x-cron-secret: $CRON_SECRET" https://tu-dominio/api/cron/generar-planilla-mensual
export async function GET(request: NextRequest) {
  const secreto = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secreto !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  const resultado = await generarPlanillaMensual(anio, mes, null);

  return NextResponse.json({
    ok: true,
    idPlanillaMensual: resultado.idPlanillaMensual,
    totalAgregados: resultado.totalAgregados,
    hayParametrosVigentes: resultado.hayParametrosVigentes,
  });
}
