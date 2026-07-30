import { PdfWriter } from "./pdf-writer";
import { EMPLEADOR, construirTokens, reemplazarTokens } from "./plantilla-tokens";

export interface ConceptoPdf {
  descripcion: string;
  monto: number;
}

export interface ProyectoPdf {
  nombreProyecto: string;
  tarifaHora: number;
}

export interface DatosContratoPdf {
  tipoContratoCodigo: "PLANILLA_FULLTIME" | "PLANILLA_PARTTIME" | "LOCADOR";
  tipoPagoLocadorCodigo?: "POR_HORA" | "POR_PROYECTO" | "MENSUAL" | "POR_JORNADA" | null;
  nombres: string;
  apellidos: string;
  tipoDocumentoDescripcion: string | null;
  nroDocumento: string | null;
  direccion: string | null;
  paisDescripcion: string | null;
  ciudadDescripcion: string | null;
  cargo: string;
  funciones: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  // Jornada (solo PLANILLA -- un locador no tiene horario por subordinacion).
  diasLaborales: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  notaJornada: string | null;
  // PLANILLA: lineas de concepto remunerativo (ingreso base, bono, etc.)
  conceptos: ConceptoPdf[];
  // LOCADOR mensual/por jornada/por proyecto: un solo monto + proyecto.
  tarifa: number | null;
  nombreProyecto: string | null;
  periodoPago: string | null;
  // LOCADOR por hora: puede tener varios proyectos, cada uno con su tarifa.
  proyectos: ProyectoPdf[];
  nroCuenta: string | null;
  cci: string | null;
  banco: string | null;
  // null cuando se genera una vista previa (antes de firmar): el bloque de
  // firma se imprime con un texto "pendiente de firma" en vez de la imagen.
  firmaPngBytes: Uint8Array | null;
  fechaFirma: Date | null;
  // CONT#AAAA-NNNN, ya formateado (ver formatearNroContrato en plantilla-tokens.ts).
  nroContrato: string;
}

export interface ClausulaPlantillaPdf {
  titulo: string | null;
  contenido: string;
}

export interface PlantillaContratoPdf {
  tituloDocumento: string;
  parrafoIntro: string;
  clausulas: ClausulaPlantillaPdf[];
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
}

// El contenido (titulo, parrafo de identificacion de partes, clausulas) lo
// define RRHH desde /rrhh/contratos/plantillas (maestro de contratos), con
// placeholders tipo {{NOMBRE_COMPLETO}} -- ver src/lib/rrhh/plantilla-tokens.ts
// para el listado completo. El bloque de firma y el encabezado/pie de
// pagina se mantienen fijos en codigo, no son editables via plantilla.
export async function generarContratoPdf(datos: DatosContratoPdf, plantilla: PlantillaContratoPdf): Promise<Uint8Array> {
  const writer = await PdfWriter.crear({
    logoBytes: plantilla.logoBytes,
    logoFormato: plantilla.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: datos.nroContrato,
  });

  const tokens = construirTokens(datos);
  const nombreCompleto = tokens.NOMBRE_COMPLETO;

  writer.titulo(plantilla.tituloDocumento);
  writer.parrafo(reemplazarTokens(plantilla.parrafoIntro, tokens));

  for (const clausula of plantilla.clausulas) {
    if (clausula.titulo) writer.subtitulo(reemplazarTokens(clausula.titulo, tokens));
    writer.parrafo(reemplazarTokens(clausula.contenido, tokens));
  }

  const etiquetaFirmante = datos.tipoContratoCodigo === "LOCADOR" ? "PROVEEDOR" : "EL(LA) TRABAJADOR(A)";
  await escribirBloqueFirma(writer, datos, nombreCompleto, etiquetaFirmante);

  return writer.bytes();
}

// Locador (acuerdo de servicios) firma lado a lado, sin recuadro -- asi
// se ven los acuerdos reales de la empresa. Planilla mantiene el recuadro
// con borde de cada parte, uno debajo del otro.
async function escribirBloqueFirma(
  writer: PdfWriter,
  datos: DatosContratoPdf,
  nombreCompleto: string,
  etiquetaFirmante: string,
): Promise<void> {
  writer.espacio(10);
  writer.parrafo("Firmado y aceptado por:", { negrita: true });

  if (datos.tipoContratoCodigo === "LOCADOR") {
    await writer.firmasEnColumnas(
      { nombre: nombreCompleto.toUpperCase(), rol: etiquetaFirmante, firmaPngBytes: datos.firmaPngBytes },
      { nombre: EMPLEADOR.representanteNombre.toUpperCase(), rol: "REPRESENTANTE LEGAL", firmaPngBytes: null },
    );
    return;
  }

  await writer.firmaEnRecuadro({
    etiqueta: "EL EMPLEADOR",
    nombreParte: `${EMPLEADOR.razonSocial} - RUC: ${EMPLEADOR.ruc}`,
    identificacion: `Rep. Legal: ${EMPLEADOR.representanteNombre}`,
    firmaPngBytes: null,
  });

  writer.espacio(8);

  await writer.firmaEnRecuadro({
    etiqueta: etiquetaFirmante,
    nombreParte: nombreCompleto,
    identificacion: `${datos.tipoDocumentoDescripcion ?? "DNI"}: ${datos.nroDocumento ?? "-"}`,
    firmaPngBytes: datos.firmaPngBytes,
  });
}
