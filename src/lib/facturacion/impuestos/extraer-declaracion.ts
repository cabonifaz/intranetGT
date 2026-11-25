import OpenAI from "openai";

// Lee la constancia de presentacion de SUNAT (PDT 621 mensual de IGV+Renta,
// o la Declaracion Jurada Anual de Renta) y devuelve el periodo, el tipo y
// los montos del periodo en JSON -- mismo criterio y mismo proveedor que
// extraer-solicitud-contrato.ts (OpenAI Responses API con vision/PDF,
// OPENAI_API_KEY + OPENAI_MODEL configuradas en el proyecto, ningun
// servicio de OCR aparte).
const MODELO = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export interface DatosExtraidosDeclaracion {
  tipoDeclaracion: "IGV_RENTA_MENSUAL" | "DJ_ANUAL_RENTA" | null;
  anio: number | null;
  mes: number | null; // 1-12, siempre null si tipoDeclaracion es DJ_ANUAL_RENTA
  ventasGravadas: number | null;
  comprasGravadas: number | null;
  igvVentas: number | null;
  igvCompras: number | null;
  igvResultante: number | null;
  pagoACuentaRenta: number | null;
  impuestoCalculadoRenta: number | null;
  pagosACuentaAcumulados: number | null;
  saldoRenta: number | null;
  montoTotalAPagar: number | null;
  advertencias: string[];
}

const CAMPOS_MONTO = [
  "ventasGravadas",
  "comprasGravadas",
  "igvVentas",
  "igvCompras",
  "igvResultante",
  "pagoACuentaRenta",
  "impuestoCalculadoRenta",
  "pagosACuentaAcumulados",
  "saldoRenta",
  "montoTotalAPagar",
] as const;

const PROMPT_SISTEMA = `Eres un asistente que lee constancias de presentacion de SUNAT (Peru) y devuelve sus datos en JSON estricto, sin inventar valores.

El documento es UNA de estas dos constancias:

1. PDT 621 -- IGV + pago a cuenta de Renta MENSUAL. Suele decir "Formulario 621" o "IGV - Renta mensual", y tiene un "Periodo tributario" en formato MM/AAAA (ej. "10/2026" = octubre 2026). Campos tipicos: Ventas gravadas, Compras gravadas, IGV de ventas, IGV de compras, IGV resultante (o "tributo resultante"/"saldo a favor del periodo" -- si dice saldo a favor, el valor es NEGATIVO), Pago a cuenta del Impuesto a la Renta, Importe total a pagar.

2. Declaracion Jurada ANUAL de Renta (formulario de Renta Anual de 3ra categoria, ej. 710/709 u otro segun el año). Dice "Ejercicio" o "Periodo" con solo el AÑO (ej. "2025"), sin mes. Campos tipicos: Impuesto calculado, Pagos a cuenta del ejercicio (o "credito/saldo aplicado"), Saldo del Impuesto a la Renta (si dice "a favor del contribuyente" el valor es NEGATIVO, si dice "por regularizar" o "tributo a pagar" es POSITIVO), Importe a pagar.

Identifica cual de los dos es por el numero de formulario o el titulo del documento, y si tiene mes (mensual) o no (anual).

Devuelve SOLO un objeto JSON (sin texto antes ni despues, sin bloque de codigo markdown) con esta forma exacta:
{
  "tipoDeclaracion": "IGV_RENTA_MENSUAL" | "DJ_ANUAL_RENTA" | null (null si no se puede determinar cual de los dos es),
  "anio": number o null,
  "mes": number (1-12) o null (SIEMPRE null si tipoDeclaracion es DJ_ANUAL_RENTA),
  "ventasGravadas": number o null (null si es DJ_ANUAL_RENTA),
  "comprasGravadas": number o null (null si es DJ_ANUAL_RENTA),
  "igvVentas": number o null (null si es DJ_ANUAL_RENTA),
  "igvCompras": number o null (null si es DJ_ANUAL_RENTA),
  "igvResultante": number o null (null si es DJ_ANUAL_RENTA; negativo si es saldo a favor),
  "pagoACuentaRenta": number o null (null si es DJ_ANUAL_RENTA),
  "impuestoCalculadoRenta": number o null (null si es IGV_RENTA_MENSUAL),
  "pagosACuentaAcumulados": number o null (null si es IGV_RENTA_MENSUAL),
  "saldoRenta": number o null (null si es IGV_RENTA_MENSUAL; negativo si es a favor del contribuyente),
  "montoTotalAPagar": number o null (el importe total/neto a pagar de la constancia; 0 si no hay nada por pagar),
  "advertencias": string[] (frases cortas en español describiendo cualquier campo ilegible, ambiguo, o si no se pudo determinar con confianza el tipo/periodo -- array vacio si todo se leyo con claridad)
}

Si un campo no se puede leer con confianza, usa null y agrega una advertencia -- nunca inventes ni asumas un valor por defecto. Si el documento claramente no es ninguna de estas dos constancias de SUNAT, devuelve tipoDeclaracion null y explica por que en advertencias.`;

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

function comoNumeroONull(valor: unknown): number | null {
  const n = Number(valor);
  return typeof valor === "number" || (typeof valor === "string" && valor.trim()) ? (Number.isFinite(n) ? n : null) : null;
}

// Normaliza lo que devuelve el modelo a la forma exacta de
// DatosExtraidosDeclaracion -- nunca confia ciegamente en el JSON ajeno
// (tipos incorrectos, campos faltantes, enums con otra capitalizacion).
function normalizar(bruto: Record<string, unknown>): DatosExtraidosDeclaracion {
  const tipoBruto = typeof bruto.tipoDeclaracion === "string" ? bruto.tipoDeclaracion.toUpperCase() : null;
  const tipoDeclaracion = tipoBruto === "IGV_RENTA_MENSUAL" || tipoBruto === "DJ_ANUAL_RENTA" ? tipoBruto : null;

  const anio = comoNumeroONull(bruto.anio);
  const mesBruto = comoNumeroONull(bruto.mes);
  const mes = tipoDeclaracion === "IGV_RENTA_MENSUAL" && mesBruto !== null && mesBruto >= 1 && mesBruto <= 12 ? mesBruto : null;

  const datos = { tipoDeclaracion, anio, mes } as DatosExtraidosDeclaracion;
  for (const campo of CAMPOS_MONTO) {
    datos[campo] = comoNumeroONull(bruto[campo]);
  }

  datos.advertencias = Array.isArray(bruto.advertencias) ? bruto.advertencias.filter((a): a is string => typeof a === "string") : [];

  return datos;
}

export async function extraerDeclaracionTributaria(
  bytes: Uint8Array,
  mimeType: "application/pdf" | "image/png" | "image/jpeg",
): Promise<DatosExtraidosDeclaracion> {
  const client = new OpenAI();
  const base64 = Buffer.from(bytes).toString("base64");

  const bloqueArchivo: OpenAI.Responses.ResponseInputFile | OpenAI.Responses.ResponseInputImage =
    mimeType === "application/pdf"
      ? { type: "input_file", filename: "constancia.pdf", file_data: `data:application/pdf;base64,${base64}` }
      : { type: "input_image", detail: "auto", image_url: `data:${mimeType};base64,${base64}` };

  let respuestaTexto: string;
  try {
    const response = await client.responses.create({
      model: MODELO,
      instructions: PROMPT_SISTEMA,
      input: [
        {
          role: "user",
          content: [bloqueArchivo, { type: "input_text", text: "Extrae los datos de esta constancia de SUNAT. Responde solo con el JSON." }],
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
    throw new Error("No se pudo interpretar la respuesta de extraccion -- sube este archivo a mano desde 'Nueva declaracion'.");
  }
  if (typeof bruto !== "object" || bruto === null) {
    throw new Error("La extraccion no devolvio un objeto valido.");
  }

  return normalizar(bruto as Record<string, unknown>);
}
