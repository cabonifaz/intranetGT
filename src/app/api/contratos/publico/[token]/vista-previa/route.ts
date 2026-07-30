import { NextResponse } from "next/server";
import {
  obtenerContratoPorToken,
  listarConceptosContrato,
  listarProyectosContrato,
} from "@/lib/db/repositories/contrato.repository";
import { generarContratoPdf } from "@/lib/rrhh/generar-contrato-pdf";
import { formatearNroContrato } from "@/lib/rrhh/plantilla-tokens";
import { resolverPlantillaContrato } from "@/lib/rrhh/resolver-plantilla";
import type { TipoContratoCodigo, TipoPagoLocadorCodigo } from "@/types/db";

// Version sin firma del contrato, para que el postulante lo pueda leer
// completo antes de firmarlo (link publico con token, ver
// /contratos/firmar/[token]). Misma vigencia que el endpoint de firma.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contrato = await obtenerContratoPorToken(token);
  if (!contrato) {
    return NextResponse.json({ error: "Link invalido." }, { status: 404 });
  }
  if (contrato.ESTADO_CONTRATO_CODIGO !== "PENDIENTE_FIRMA") {
    return NextResponse.json({ error: "Este contrato ya no esta disponible." }, { status: 409 });
  }
  if (!contrato.TOKEN_EXPIRA || new Date(contrato.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link ha expirado. Pide a RRHH que genere uno nuevo." }, { status: 410 });
  }

  const plantilla = await resolverPlantillaContrato(contrato);
  if (!plantilla) {
    return NextResponse.json(
      { error: "No hay una plantilla de contrato activa para este regimen. Contacta a RRHH." },
      { status: 409 },
    );
  }

  const esPlanilla = contrato.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const esPorHora = contrato.TIPO_PAGO_LOCADOR_CODIGO === "POR_HORA";

  const [conceptos, proyectos] = await Promise.all([
    esPlanilla ? listarConceptosContrato(contrato.ID_CONTRATO) : Promise.resolve([]),
    esPorHora ? listarProyectosContrato(contrato.ID_CONTRATO) : Promise.resolve([]),
  ]);

  const pdfBytes = await generarContratoPdf(
    {
      tipoContratoCodigo: contrato.TIPO_CONTRATO_CODIGO as TipoContratoCodigo,
      tipoPagoLocadorCodigo: contrato.TIPO_PAGO_LOCADOR_CODIGO as TipoPagoLocadorCodigo | null,
      nombres: contrato.NOMBRES,
      apellidos: contrato.APELLIDOS,
      tipoDocumentoDescripcion: contrato.TIPO_DOCUMENTO_DESCRIPCION,
      nroDocumento: contrato.NRO_DOCUMENTO,
      direccion: contrato.DIRECCION,
      paisDescripcion: contrato.PAIS_DESCRIPCION,
      ciudadDescripcion: contrato.CIUDAD_DESCRIPCION,
      cargo: contrato.CARGO,
      funciones: contrato.FUNCIONES,
      fechaInicio: contrato.FECHA_INICIO,
      fechaFin: contrato.FECHA_FIN,
      diasLaborales: contrato.DIAS_LABORALES,
      horaInicio: contrato.HORA_INICIO,
      horaFin: contrato.HORA_FIN,
      notaJornada: contrato.NOTA_JORNADA,
      conceptos: conceptos.map((c) => ({ descripcion: c.CONCEPTO_DESCRIPCION, monto: Number(c.MONTO) })),
      tarifa: contrato.TARIFA ? Number(contrato.TARIFA) : null,
      nombreProyecto: contrato.NOMBRE_PROYECTO,
      periodoPago: contrato.PERIODO_PAGO,
      proyectos: proyectos.map((p) => ({ nombreProyecto: p.NOMBRE_PROYECTO ?? "-", tarifaHora: Number(p.TARIFA_HORA) })),
      nroCuenta: null,
      cci: null,
      banco: null,
      firmaPngBytes: null,
      fechaFirma: null,
      nroContrato: formatearNroContrato(contrato.ID_CONTRATO, new Date(contrato.FECHA_CREACION)),
    },
    plantilla,
  );

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="contrato-vista-previa.pdf"',
    },
  });
}
