import { NextResponse } from "next/server";
import {
  obtenerContratoPorToken,
  firmarContrato,
  listarConceptosContrato,
  listarProyectosContrato,
} from "@/lib/db/repositories/contrato.repository";
import { generarContratoPdf } from "@/lib/rrhh/generar-contrato-pdf";
import { tieneIdentidadCompletaContrato } from "@/lib/rrhh/identidad";
import { formatearNroContrato } from "@/lib/rrhh/plantilla-tokens";
import { resolverPlantillaContrato } from "@/lib/rrhh/resolver-plantilla";
import { guardarArchivo } from "@/lib/storage/local-storage";
import type { TipoContratoCodigo, TipoPagoLocadorCodigo } from "@/types/db";

function decodificarFirmaPng(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contrato = await obtenerContratoPorToken(token);
  if (!contrato) {
    return NextResponse.json({ error: "Link invalido." }, { status: 404 });
  }
  if (contrato.ESTADO_CONTRATO_CODIGO !== "PENDIENTE_FIRMA") {
    return NextResponse.json({ error: "Este contrato ya no esta disponible para firmar." }, { status: 409 });
  }
  if (!contrato.TOKEN_EXPIRA || new Date(contrato.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link de firma ha expirado. Pide a RRHH que genere uno nuevo." }, { status: 410 });
  }
  if (!tieneIdentidadCompletaContrato(contrato)) {
    return NextResponse.json(
      { error: "Falta el documento de identidad (tipo y numero). Pide a RRHH que lo complete." },
      { status: 409 },
    );
  }

  const plantilla = await resolverPlantillaContrato(contrato);
  if (!plantilla) {
    return NextResponse.json(
      { error: "No hay una plantilla de contrato activa para este regimen. Contacta a RRHH." },
      { status: 409 },
    );
  }

  let body: { nroCuenta?: string; cci?: string; banco?: string; firmaPngDataUrl?: string; confirmoLectura?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la peticion invalido." }, { status: 400 });
  }

  const nroCuenta = body.nroCuenta?.trim() || null;
  const cci = body.cci?.trim() || null;
  const banco = body.banco?.trim() || null;

  if (body.confirmoLectura !== true) {
    return NextResponse.json({ error: "Debes confirmar que leiste el contrato antes de firmar." }, { status: 400 });
  }
  if (!body.firmaPngDataUrl) {
    return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
  }
  if (!nroCuenta || !cci || !banco) {
    return NextResponse.json({ error: "Completa tus datos bancarios." }, { status: 400 });
  }

  const firmaPngBytes = decodificarFirmaPng(body.firmaPngDataUrl);
  const fechaFirma = new Date();

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
      nroCuenta,
      cci,
      banco,
      firmaPngBytes,
      fechaFirma,
      nroContrato: formatearNroContrato(contrato.ID_CONTRATO, new Date(contrato.FECHA_CREACION)),
    },
    plantilla,
  );

  const firmaPngPath = `contratos/${contrato.ID_CONTRATO}-firma.png`;
  const documentoPath = `contratos/${contrato.ID_CONTRATO}.pdf`;

  await guardarArchivo(firmaPngPath, firmaPngBytes);
  await guardarArchivo(documentoPath, pdfBytes);

  await firmarContrato({
    idContrato: contrato.ID_CONTRATO,
    nroCuenta,
    cci,
    banco,
    firmaPngPath,
    documentoPath,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contrato-${contrato.ID_CONTRATO}.pdf"`,
    },
  });
}
