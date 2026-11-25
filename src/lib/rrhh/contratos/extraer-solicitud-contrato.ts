import OpenAI from "openai";

// Lee el escaneo de la "Solicitud de registro de contrato" (ver
// generar-solicitud-contrato-pdf.ts -- MISMO layout/orden de campos,
// cualquier cambio en uno se refleja en el otro) y devuelve sus datos en
// JSON. Usa OpenAI Responses API con vision/PDF -- no hay ningun servicio
// de OCR instalado en el proyecto. Requiere OPENAI_API_KEY configurada.
// Modelo via OPENAI_MODEL (mismo criterio que extraer-declaracion.ts).
const MODELO = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export interface ConceptoExtraido {
  concepto: string;
  monto: number;
}

export interface DatosExtraidosSolicitud {
  nombres: string | null;
  apellidos: string | null;
  nroDocumento: string | null;
  cargo: string | null;
  tipoContrato: "PLANILLA_FULLTIME" | "PLANILLA_PARTTIME" | "LOCADOR" | null;
  tipoPagoLocador: "MENSUAL" | "POR_JORNADA" | "POR_PROYECTO" | "POR_HORA" | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  diasLaborales: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  conceptosRemunerativos: ConceptoExtraido[];
  tarifa: number | null;
  monedaCodigo: "PEN" | "USD" | null;
  periodoPago: string | null;
  nroCuenta: string | null;
  cci: string | null;
  banco: string | null;
  fechaFirma: string | null;
  advertencias: string[];
}

const CAMPOS_TEXTO_O_NULL = [
  "nombres",
  "apellidos",
  "nroDocumento",
  "cargo",
  "fechaInicio",
  "fechaFin",
  "diasLaborales",
  "horaInicio",
  "horaFin",
  "periodoPago",
  "nroCuenta",
  "cci",
  "banco",
  "fechaFirma",
] as const;

const PROMPT_SISTEMA = `Eres un asistente que lee formularios escaneados de Recursos Humanos y devuelve sus datos en JSON estricto, sin inventar valores.

El documento es una "SOLICITUD DE REGISTRO DE CONTRATO" con estas secciones, en este orden (puede venir llenada a mano o a maquina, y firmada):

1. Datos del colaborador: Nombres y apellidos | Tipo y numero de documento | Cargo.
2. Tipo de contrato (casillas marcadas con una X o similar): Planilla full-time / Planilla part-time / Locador de servicios. Si es Locador, tipo de pago: Mensual / Por jornada / Por proyecto / Por hora.
3. Vigencia: Fecha de inicio | Fecha de fin (puede decir "indefinido").
4. Jornada (solo si Planilla): Dias laborales | Horario (de ___ a ___).
5. Remuneracion/tarifa: si Planilla, una tabla "Concepto | Monto (S/)" con varias filas. Si Locador (no por hora): Tarifa | Moneda (Soles/Dolares) | Periodo de pago.
6. Datos bancarios: N° de cuenta | CCI | Banco.
7. Firmas: Fecha de firma, firma del colaborador, firma del empleador.

Devuelve SOLO un objeto JSON (sin texto antes ni despues, sin bloque de codigo markdown) con esta forma exacta:
{
  "nombres": string o null,
  "apellidos": string o null,
  "nroDocumento": string o null (solo digitos/caracteres del documento, sin el tipo),
  "cargo": string o null,
  "tipoContrato": "PLANILLA_FULLTIME" | "PLANILLA_PARTTIME" | "LOCADOR" | null,
  "tipoPagoLocador": "MENSUAL" | "POR_JORNADA" | "POR_PROYECTO" | "POR_HORA" | null (null si no es Locador),
  "fechaInicio": "YYYY-MM-DD" o null,
  "fechaFin": "YYYY-MM-DD" o null (null tambien si dice "indefinido"),
  "diasLaborales": string o null (ej. "Lunes a Viernes"),
  "horaInicio": "HH:MM" o null (24 horas),
  "horaFin": "HH:MM" o null,
  "conceptosRemunerativos": [{ "concepto": string, "monto": number }] (array vacio si no aplica o esta vacio),
  "tarifa": number o null,
  "monedaCodigo": "PEN" | "USD" | null,
  "periodoPago": string o null,
  "nroCuenta": string o null,
  "cci": string o null,
  "banco": string o null,
  "fechaFirma": "YYYY-MM-DD" o null,
  "advertencias": string[] (frases cortas en español describiendo cualquier campo ilegible, ambiguo, tachado, o casilla con mas de una marca -- array vacio si todo se leyo con claridad)
}

Si un campo no se puede leer con confianza, usa null (o array vacio) y agrega una advertencia -- nunca inventes ni asumas un valor por defecto.`;

// El modelo a veces envuelve el JSON en una cerca de codigo markdown pese
// a la instruccion -- se busca el primer objeto balanceado en vez de
// confiar en que la respuesta completa sea JSON valido.
function extraerJson(texto: string): string {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error("La respuesta no contenia un objeto JSON.");
  }
  return texto.slice(inicio, fin + 1);
}

function comoStringONull(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function comoNumeroONull(valor: unknown): number | null {
  const n = Number(valor);
  return typeof valor === "number" || (typeof valor === "string" && valor.trim()) ? (Number.isFinite(n) ? n : null) : null;
}

// Normaliza lo que devuelve el modelo a la forma exacta de
// DatosExtraidosSolicitud -- nunca confia ciegamente en el JSON ajeno
// (tipos incorrectos, campos faltantes, enums con otra capitalizacion).
function normalizar(bruto: Record<string, unknown>): DatosExtraidosSolicitud {
  const datos = {} as DatosExtraidosSolicitud;
  for (const campo of CAMPOS_TEXTO_O_NULL) {
    datos[campo] = comoStringONull(bruto[campo]);
  }

  const tipoContratoBruto = typeof bruto.tipoContrato === "string" ? bruto.tipoContrato.toUpperCase() : null;
  datos.tipoContrato =
    tipoContratoBruto === "PLANILLA_FULLTIME" || tipoContratoBruto === "PLANILLA_PARTTIME" || tipoContratoBruto === "LOCADOR" ? tipoContratoBruto : null;

  const tipoPagoBruto = typeof bruto.tipoPagoLocador === "string" ? bruto.tipoPagoLocador.toUpperCase() : null;
  datos.tipoPagoLocador =
    tipoPagoBruto === "MENSUAL" || tipoPagoBruto === "POR_JORNADA" || tipoPagoBruto === "POR_PROYECTO" || tipoPagoBruto === "POR_HORA" ? tipoPagoBruto : null;

  const monedaBruta = typeof bruto.monedaCodigo === "string" ? bruto.monedaCodigo.toUpperCase() : null;
  datos.monedaCodigo = monedaBruta === "PEN" || monedaBruta === "USD" ? monedaBruta : null;

  datos.tarifa = comoNumeroONull(bruto.tarifa);

  datos.conceptosRemunerativos = Array.isArray(bruto.conceptosRemunerativos)
    ? bruto.conceptosRemunerativos
        .map((c) => {
          if (typeof c !== "object" || c === null) return null;
          const concepto = comoStringONull((c as Record<string, unknown>).concepto);
          const monto = comoNumeroONull((c as Record<string, unknown>).monto);
          return concepto && monto !== null ? { concepto, monto } : null;
        })
        .filter((c): c is ConceptoExtraido => c !== null)
    : [];

  datos.advertencias = Array.isArray(bruto.advertencias) ? bruto.advertencias.filter((a): a is string => typeof a === "string") : [];

  return datos;
}

export async function extraerSolicitudContrato(
  bytes: Uint8Array,
  mimeType: "application/pdf" | "image/png" | "image/jpeg",
): Promise<DatosExtraidosSolicitud> {
  const client = new OpenAI();
  const base64 = Buffer.from(bytes).toString("base64");

  const bloqueArchivo: OpenAI.Responses.ResponseInputFile | OpenAI.Responses.ResponseInputImage =
    mimeType === "application/pdf"
      ? { type: "input_file", filename: "solicitud.pdf", file_data: `data:application/pdf;base64,${base64}` }
      : { type: "input_image", detail: "auto", image_url: `data:${mimeType};base64,${base64}` };

  let respuestaTexto: string;
  try {
    const response = await client.responses.create({
      model: MODELO,
      instructions: PROMPT_SISTEMA,
      input: [
        {
          role: "user",
          content: [bloqueArchivo, { type: "input_text", text: "Extrae los datos de esta solicitud escaneada. Responde solo con el JSON." }],
        },
      ],
    });
    respuestaTexto = response.output_text;
    if (!respuestaTexto) throw new Error("La API no devolvio texto.");
  } catch (err) {
    if (err instanceof OpenAI.AuthenticationError) {
      throw new Error("La clave de la API de OpenAI (OPENAI_API_KEY) no esta configurada o es invalida.");
    }
    if (err instanceof OpenAI.RateLimitError) {
      throw new Error("Se alcanzo el limite de solicitudes a la API de OpenAI -- intenta de nuevo en unos minutos.");
    }
    if (err instanceof OpenAI.APIError) {
      throw new Error(`Error de la API de OpenAI: ${err.message}`);
    }
    throw err;
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(extraerJson(respuestaTexto));
  } catch {
    throw new Error("No se pudo interpretar la respuesta de extraccion -- intenta con un escaneo mas claro o carga los datos a mano.");
  }
  if (typeof bruto !== "object" || bruto === null) {
    throw new Error("La extraccion no devolvio un objeto valido.");
  }

  return normalizar(bruto as Record<string, unknown>);
}
