import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPlantilla } from "@/lib/db/repositories/plantilla-contrato.repository";
import { generarContratoPdf } from "@/lib/rrhh/generar-contrato-pdf";
import { formatearNroContrato } from "@/lib/rrhh/plantilla-tokens";
import { cargarPlantillaPorId } from "@/lib/rrhh/resolver-plantilla";

// Datos ficticios de un colaborador/proveedor de ejemplo, solo para que
// RRHH vea como quedaria el PDF de esta plantilla antes de asignarla a
// contratos reales. No toca ningun RRHH_CONTRATO ni RRHH_EMPLEADO.
const HOY = new Date();
const EN_UN_ANIO = new Date(HOY.getTime() + 365 * 24 * 60 * 60 * 1000);
const ISO = (fecha: Date) => fecha.toISOString().slice(0, 10);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_CONTRATOS", "ADMIN");

  const { id } = await params;
  const idPlantilla = Number(id);

  const [detalle, plantillaPdf] = await Promise.all([obtenerPlantilla(idPlantilla), cargarPlantillaPorId(idPlantilla)]);
  if (!detalle || !plantillaPdf) {
    return NextResponse.json({ error: "Plantilla no encontrada." }, { status: 404 });
  }

  const esLocador = detalle.TIPO_CONTRATO_CODIGO === "LOCADOR";
  const esPorHora = detalle.TIPO_PAGO_LOCADOR_CODIGO === "POR_HORA";
  const necesitaTarifaUnica = esLocador && !esPorHora;

  const pdfBytes = await generarContratoPdf(
    {
      tipoContratoCodigo: detalle.TIPO_CONTRATO_CODIGO,
      tipoPagoLocadorCodigo: detalle.TIPO_PAGO_LOCADOR_CODIGO,
      nombres: "Juan Carlos",
      apellidos: "Pérez Ejemplo",
      tipoDocumentoDescripcion: "DNI",
      nroDocumento: "12345678",
      direccion: "Av. Ejemplo 123, Lima",
      paisDescripcion: "Perú",
      ciudadDescripcion: "Lima",
      cargo: "Analista de Ejemplo",
      funciones: "Funciones de ejemplo para esta vista previa.",
      fechaInicio: ISO(HOY),
      fechaFin: ISO(EN_UN_ANIO),
      diasLaborales: esLocador ? null : "Lunes a Viernes",
      horaInicio: esLocador ? null : "09:00",
      horaFin: esLocador ? null : "18:00",
      notaJornada: null,
      conceptos: esLocador
        ? []
        : [
            { descripcion: "Ingreso base", monto: 2000 },
            { descripcion: "Movilidad / transporte", monto: 300 },
          ],
      tarifa: necesitaTarifaUnica ? 1500 : null,
      nombreProyecto: necesitaTarifaUnica ? "Proyecto Ejemplo" : null,
      periodoPago: necesitaTarifaUnica ? "Enero 2026" : null,
      proyectos: esPorHora ? [{ nombreProyecto: "Proyecto Ejemplo", tarifaHora: 50 }] : [],
      nroCuenta: "000-1234567-0-01",
      cci: "00212300123456780012",
      banco: "Banco de Ejemplo",
      firmaPngBytes: null,
      fechaFirma: null,
      nroContrato: formatearNroContrato(idPlantilla, HOY),
    },
    plantillaPdf,
  );

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="contrato-ejemplo.pdf"',
    },
  });
}
