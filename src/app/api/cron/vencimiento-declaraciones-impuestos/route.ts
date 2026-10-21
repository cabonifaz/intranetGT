import { NextResponse, type NextRequest } from "next/server";
import { listarDeclaracionesPendientesVencimiento } from "@/lib/db/repositories/declaracion-tributaria.repository";
import { listarRoles } from "@/lib/db/repositories/rol.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { crearNotificacion } from "@/lib/db/repositories/notificacion.repository";

const DIAS_ALERTA_VENCIMIENTO = 7;
const CODIGOS_ROL_FACTURACION = ["FACTURACION_JEFATURA", "FACTURACION_ASISTENTE"];

// Mismo patron que contratos-por-vencer: pensado para llamarse a diario
// desde un cron del VPS, ej.:
//   curl -H "x-cron-secret: $CRON_SECRET" https://tu-dominio/api/cron/vencimiento-declaraciones-impuestos
// Alerta dos casos (ver SP_DECLARACION_TRIBUTARIA_LISTAR_PENDIENTES_VENCIMIENTO):
// BORRADOR a punto de vencer su fecha de presentacion, o PRESENTADA con
// un monto pendiente de pago a punto de vencer -- SUNAT usa la misma
// fecha de cronograma para presentar y pagar.
export async function GET(request: NextRequest) {
  const secreto = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secreto !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const pendientes = await listarDeclaracionesPendientesVencimiento(DIAS_ALERTA_VENCIMIENTO);
  if (pendientes.length === 0) {
    return NextResponse.json({ ok: true, notificados: 0 });
  }

  const [roles, categorias] = await Promise.all([listarRoles(true), listarMaestros("CATEGORIA_NOTIFICACION")]);

  const idsRolesFacturacion = roles.filter((r) => CODIGOS_ROL_FACTURACION.includes(r.CODIGO)).map((r) => r.ID_ROL);
  const categoriaSistema = categorias.find((c) => c.CODIGO === "SISTEMA");

  if (idsRolesFacturacion.length === 0 || !categoriaSistema) {
    return NextResponse.json({ error: "No se encontraron los roles de Facturacion o la categoria SISTEMA." }, { status: 500 });
  }

  const mensaje = pendientes
    .map((d) => {
      const periodo = d.MES === 0 ? `${d.ANIO}` : `${d.MES}/${d.ANIO}`;
      const motivo = d.ESTADO_DECLARACION_CODIGO === "BORRADOR" ? "pendiente de presentar" : "pendiente de pago";
      return `${d.TIPO_DECLARACION_DESCRIPCION} ${periodo} (${motivo}) vence el ${d.FECHA_VENCIMIENTO}`;
    })
    .join("; ");

  await crearNotificacion({
    idCategoria: categoriaSistema.ID_MAESTRO,
    titulo: `${pendientes.length} declaracion(es) de impuestos por vencer`,
    mensaje,
    idAplicacionOrigen: null,
    urlDestino: "/facturacion/impuestos",
    idUsuarioEmisor: null,
    destinatarios: { roles: idsRolesFacturacion },
  });

  return NextResponse.json({ ok: true, notificados: pendientes.length });
}
