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
  fechaPresentacion: string | null; // "YYYY-MM-DD", la fecha real de SUNAT impresa en la constancia -- NUNCA el dia en que se sube el archivo a la intranet
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

// Campos de verificacion (no se guardan en BD, solo se usan para cuadrar
// la aritmetica contra "igvResultante"/"pagoACuentaRenta" antes de
// aceptarlos -- ver normalizar()).
const CAMPOS_VERIFICACION = ["igvResultanteBruto", "igvSaldoAnterior", "pagoACuentaRentaBruto", "pagoACuentaRentaSaldoAnterior"] as const;

const PROMPT_SISTEMA = `Eres un asistente que lee constancias de presentacion de SUNAT (Peru) y devuelve sus datos en JSON estricto, sin inventar valores.

El documento es UNA de estas dos constancias:

1. PDT 621 -- IGV + pago a cuenta de Renta MENSUAL. Suele decir "Formulario 621" o "IGV - Renta mensual", y tiene un "Periodo tributario" en formato MM/AAAA (ej. "10/2026" = octubre 2026).

   La seccion "Determinacion de la Deuda" tiene, para IGV y para Renta por separado, TRES filas distintas que NO hay que confundir:
   a) "Impuesto Resultante o Saldo a Favor" -- el resultado de ESE mes solo, SIN aplicar ningun credito anterior (bruto).
   b) "Saldo a Favor del Periodo anterior" -- el credito que traia acumulado de meses previos.
   c) "Tributo a Pagar o Saldo a Favor" -- el resultado FINAL, (a) menos (b), que es el que realmente importa (si es positivo hay que pagarlo, si es negativo es el saldo a favor que queda para el siguiente periodo).

   SIEMPRE usa la fila (c), la FINAL, para "igvResultante" (IGV) y "pagoACuentaRenta" (Renta) -- nunca la fila (a). Si la constancia NO muestra por separado (a)/(b)/(c) (algunas no tienen saldo anterior que aplicar, por ejemplo si nunca hubo credito), basta con una sola fila de resultado y esa es la que se usa.

   Otros campos tipicos: Ventas gravadas, Compras gravadas, IGV de ventas, IGV de compras, Importe total a pagar.

2. Declaracion Jurada ANUAL de Renta (formulario de Renta Anual de 3ra categoria, ej. 710/709 u otro segun el año). Dice "Ejercicio" o "Periodo" con solo el AÑO (ej. "2025"), sin mes. Campos tipicos: Impuesto calculado, Pagos a cuenta del ejercicio (o "credito/saldo aplicado"), Saldo del Impuesto a la Renta (si dice "a favor del contribuyente" el valor es NEGATIVO, si dice "por regularizar" o "tributo a pagar" es POSITIVO), Importe a pagar. Esta NO tiene el esquema de 3 filas de la mensual -- es un calculo anual propio, independiente de otros años.

Identifica cual de los dos es por el numero de formulario o el titulo del documento, y si tiene mes (mensual) o no (anual).

Ambas constancias traen, cerca del encabezado ("Identificacion de la Transaccion" o similar), una "Fecha de presentacion" (formato DD/MM/AAAA) -- esta es la fecha REAL en que se presento a SUNAT, distinta de cualquier otra fecha del documento (como la fecha/hora de impresion de la constancia, si aparece aparte). Siempre extraela si esta visible.

Devuelve SOLO un objeto JSON (sin texto antes ni despues, sin bloque de codigo markdown) con esta forma exacta:
{
  "tipoDeclaracion": "IGV_RENTA_MENSUAL" | "DJ_ANUAL_RENTA" | null (null si no se puede determinar cual de los dos es),
  "anio": number o null,
  "mes": number (1-12) o null (SIEMPRE null si tipoDeclaracion es DJ_ANUAL_RENTA),
  "fechaPresentacion": "AAAA-MM-DD" o null (la "Fecha de presentacion" de la constancia, convertida de DD/MM/AAAA a AAAA-MM-DD -- null si no se puede leer con confianza),
  "ventasGravadas": number o null (null si es DJ_ANUAL_RENTA),
  "comprasGravadas": number o null (null si es DJ_ANUAL_RENTA),
  "igvVentas": number o null (null si es DJ_ANUAL_RENTA),
  "igvCompras": number o null (null si es DJ_ANUAL_RENTA),
  "igvResultante": number o null (SOLO la fila FINAL "Tributo a Pagar o Saldo a Favor" de IGV, null si es DJ_ANUAL_RENTA; negativo si es saldo a favor),
  "igvResultanteBruto": number o null (la fila "Impuesto Resultante o Saldo a Favor" de IGV, bruto, SIN aplicar el saldo anterior -- null si la constancia no distingue bruto/final, o si es DJ_ANUAL_RENTA),
  "igvSaldoAnterior": number o null (la fila "Saldo a Favor del Periodo anterior" de IGV -- null si no aplica o es DJ_ANUAL_RENTA),
  "pagoACuentaRenta": number o null (SOLO la fila FINAL "Tributo a Pagar o Saldo a Favor" de Renta, null si es DJ_ANUAL_RENTA; puede ser negativo si queda saldo a favor de Renta),
  "pagoACuentaRentaBruto": number o null (la fila "Impuesto Resultante o Saldo a Favor" de Renta, bruto -- null si la constancia no distingue bruto/final, o si es DJ_ANUAL_RENTA),
  "pagoACuentaRentaSaldoAnterior": number o null (la fila "Saldo a Favor del Periodo anterior" de Renta -- null si no aplica o es DJ_ANUAL_RENTA),
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

// "AAAA-MM-DD" valido y con una fecha real (evita ej. "2026-13-40" que
// pasaria el regex pero no existe) -- cualquier otro formato se descarta
// en vez de intentar re-parsear variantes.
function comoFechaIsoONull(valor: unknown): string | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 10) === valor ? valor : null;
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

  const fechaPresentacion = comoFechaIsoONull(bruto.fechaPresentacion);

  const datos = { tipoDeclaracion, anio, mes, fechaPresentacion } as DatosExtraidosDeclaracion;
  for (const campo of CAMPOS_MONTO) {
    datos[campo] = comoNumeroONull(bruto[campo]);
  }

  const advertencias = Array.isArray(bruto.advertencias) ? bruto.advertencias.filter((a): a is string => typeof a === "string") : [];
  if (bruto.fechaPresentacion && fechaPresentacion === null) {
    advertencias.push("No se pudo leer con confianza la fecha de presentacion -- se usara la fecha de hoy, verificala contra la constancia.");
  }

  // Cuadre: bruto - saldo anterior debe dar el resultado FINAL que se
  // guarda (igvResultante/pagoACuentaRenta) -- si la constancia traia las
  // 3 filas y no cuadran, el modelo probablemente confundio una fila con
  // otra (ver prompt). Solo es un chequeo, nunca sobreescribe el valor
  // final que ya se leyo.
  const verificacion = {} as Record<(typeof CAMPOS_VERIFICACION)[number], number | null>;
  for (const campo of CAMPOS_VERIFICACION) {
    verificacion[campo] = comoNumeroONull(bruto[campo]);
  }
  if (verificacion.igvResultanteBruto !== null && verificacion.igvSaldoAnterior !== null && datos.igvResultante !== null) {
    const esperado = verificacion.igvResultanteBruto - verificacion.igvSaldoAnterior;
    if (Math.abs(esperado - datos.igvResultante) > 0.5) {
      advertencias.push(
        `El IGV resultante final (${datos.igvResultante}) no cuadra con bruto (${verificacion.igvResultanteBruto}) menos saldo anterior (${verificacion.igvSaldoAnterior}) = ${esperado} -- verifica la constancia.`,
      );
    }
  }
  if (verificacion.pagoACuentaRentaBruto !== null && verificacion.pagoACuentaRentaSaldoAnterior !== null && datos.pagoACuentaRenta !== null) {
    const esperado = verificacion.pagoACuentaRentaBruto - verificacion.pagoACuentaRentaSaldoAnterior;
    if (Math.abs(esperado - datos.pagoACuentaRenta) > 0.5) {
      advertencias.push(
        `El pago a cuenta Renta final (${datos.pagoACuentaRenta}) no cuadra con bruto (${verificacion.pagoACuentaRentaBruto}) menos saldo anterior (${verificacion.pagoACuentaRentaSaldoAnterior}) = ${esperado} -- verifica la constancia.`,
      );
    }
  }

  datos.advertencias = advertencias;

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
