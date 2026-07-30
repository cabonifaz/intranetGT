import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarCuotasPendientes } from "@/lib/db/repositories/pasivo.repository";
import { calcularProyeccion } from "@/lib/pasivos/proyeccion";
import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { EMPLEADOR } from "@/lib/rrhh/plantilla-tokens";

function formatearMonto(monto: number, monedaCodigo: string | null): string {
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "short" });
}

export async function GET(request: Request) {
  await requirePermiso("PASIVOS_EMPRESA", "LECTURA");

  const url = new URL(request.url);
  const idCuentaFiltro = url.searchParams.get("cuenta");

  const [cuotas, logo] = await Promise.all([listarCuotasPendientes(), cargarLogoEmpresa()]);
  const cuotasFiltradas = idCuentaFiltro ? cuotas.filter((c) => String(c.ID_CUENTA_PAGO) === idCuentaFiltro) : cuotas;
  const grupos = calcularProyeccion(cuotasFiltradas);

  const writer = await PdfWriter.crear({
    logoBytes: logo.logoBytes,
    logoFormato: logo.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: `Plan de pagos - ${new Date().toLocaleDateString("es-PE")}`,
  });

  writer.titulo("Plan de pagos - Pasivos");

  if (grupos.length === 0) {
    writer.parrafo("No hay cuotas pendientes.");
  }

  for (const grupo of grupos) {
    writer.subtitulo(
      grupo.saldoActual !== null
        ? `${grupo.nombre} (saldo actual: ${formatearMonto(grupo.saldoActual, grupo.monedaCodigo)})`
        : grupo.nombre,
    );

    const encabezado = grupo.saldoActual !== null
      ? "| Acreedor | Cuota | Vencimiento | Monto | Saldo proyectado |"
      : "| Acreedor | Cuota | Vencimiento | Monto |";
    const filas = grupo.cuotas.map((c) =>
      grupo.saldoActual !== null
        ? `| ${c.ACREEDOR} | ${c.NRO_CUOTA} | ${formatearFecha(c.FECHA_VENCIMIENTO)} | ${formatearMonto(Number(c.MONTO), grupo.monedaCodigo)} | ${formatearMonto(c.saldoProyectado, grupo.monedaCodigo)} |`
        : `| ${c.ACREEDOR} | ${c.NRO_CUOTA} | ${formatearFecha(c.FECHA_VENCIMIENTO)} | ${formatearMonto(Number(c.MONTO), grupo.monedaCodigo)} |`,
    );
    writer.parrafo([encabezado, ...filas].join("\n"));
  }

  const pdfBytes = await writer.bytes();

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="plan-de-pagos.pdf"',
    },
  });
}
