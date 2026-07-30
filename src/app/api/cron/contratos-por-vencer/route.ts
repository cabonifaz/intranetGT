import { NextResponse, type NextRequest } from "next/server";
import { listarContratos } from "@/lib/db/repositories/contrato.repository";
import { listarRoles } from "@/lib/db/repositories/rol.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { crearNotificacion } from "@/lib/db/repositories/notificacion.repository";

const DIAS_ALERTA_VENCIMIENTO = 30;
const CODIGOS_ROL_RRHH = ["RRHH_JEFATURA", "RRHH_ASISTENTE"];

// Pensado para llamarse a diario desde un cron del VPS, ej.:
//   curl -H "x-cron-secret: $CRON_SECRET" https://tu-dominio/api/cron/contratos-por-vencer
export async function GET(request: NextRequest) {
  const secreto = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secreto !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const porVencer = await listarContratos(null, DIAS_ALERTA_VENCIMIENTO);
  if (porVencer.length === 0) {
    return NextResponse.json({ ok: true, notificados: 0 });
  }

  const [roles, categorias] = await Promise.all([
    listarRoles(true),
    listarMaestros("CATEGORIA_NOTIFICACION"),
  ]);

  const idsRolesRrhh = roles.filter((r) => CODIGOS_ROL_RRHH.includes(r.CODIGO)).map((r) => r.ID_ROL);
  const categoriaSistema = categorias.find((c) => c.CODIGO === "SISTEMA");

  if (idsRolesRrhh.length === 0 || !categoriaSistema) {
    return NextResponse.json({ error: "No se encontraron los roles de RRHH o la categoria SISTEMA." }, { status: 500 });
  }

  const mensaje = porVencer
    .map((c) => `${c.NOMBRES} ${c.APELLIDOS} (${c.CARGO}) vence el ${c.FECHA_FIN}`)
    .join("; ");

  await crearNotificacion({
    idCategoria: categoriaSistema.ID_MAESTRO,
    titulo: `${porVencer.length} contrato(s) por vencer`,
    mensaje,
    idAplicacionOrigen: null,
    urlDestino: "/rrhh/contratos",
    idUsuarioEmisor: null,
    destinatarios: { roles: idsRolesRrhh },
  });

  return NextResponse.json({ ok: true, notificados: porVencer.length });
}
