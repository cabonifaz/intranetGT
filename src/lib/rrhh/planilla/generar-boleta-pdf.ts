import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { EMPLEADOR, formatearMoneda, formatearFechaCorta } from "@/lib/rrhh/plantilla-tokens";
import { montoEnLetras } from "@/lib/rrhh/numero-a-letras";
import { formatearNroBoleta } from "./tokens";

// Boleta de pago (5ta categoria, PLANILLA_FULLTIME/PARTTIME) en el
// formato clasico de boleta de sueldo peruana: A4 horizontal, cabecera
// de identificacion del empleador/trabajador, e INGRESOS/DESCUENTOS uno
// al lado del otro (el horizontal es justo lo que hace posible ese
// layout de dos columnas -- en vertical no entraban lado a lado sin
// verse apretadas). No usa PdfWriter (pensado para documentos que
// fluyen en una sola columna vertical, como contratos/RxH) -- esto es
// pdf-lib directo, con su propio layout fijo tipo formulario. El EsSalud
// se muestra como nota informativa aparte (costo del empleador) -- no
// aparece en Descuentos ni resta el neto.
const PAGE_WIDTH = 841.89; // A4 horizontal
const PAGE_HEIGHT = 595.28;
const MARGEN = 36;
const ANCHO_UTIL = PAGE_WIDTH - MARGEN * 2;
const COLOR_MARCA = rgb(0.15, 0.35, 0.75);
const COLOR_TEXTO_TENUE = rgb(0.45, 0.45, 0.45);
const COLOR_BORDE = rgb(0.75, 0.75, 0.75);
const COLOR_FONDO_ENCABEZADO = rgb(0.93, 0.96, 0.99);
const COLOR_FONDO_NETO = rgb(0.9, 0.96, 0.92);
const COLOR_VERDE = rgb(0.11, 0.45, 0.24);

export interface DatosBoletaPdf {
  idPlanillaDetalle: number;
  periodo: string;
  anio: number;
  nombres: string;
  apellidos: string;
  cargo: string;
  tipoDocumentoDescripcion: string | null;
  nroDocumento: string | null;
  nroCuenta: string | null;
  cci: string | null;
  banco: string | null;
  sistemaPensionDescripcion: string | null;
  afpFondoDescripcion: string | null;
  conceptosIngreso: { descripcion: string; monto: number }[];
  bruto: number;
  aportePension: number;
  retencionRenta: number;
  essalud: number;
  neto: number;
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
}

interface Fonts {
  normal: PDFFont;
  negrita: PDFFont;
}

function dibujarTexto(pagina: PDFPage, texto: string, x: number, y: number, fuente: PDFFont, tamano: number, color = rgb(0.1, 0.1, 0.1)) {
  pagina.drawText(texto, { x, y, size: tamano, font: fuente, color });
}

function dibujarTextoDerecha(pagina: PDFPage, texto: string, xDerecha: number, y: number, fuente: PDFFont, tamano: number, color = rgb(0.1, 0.1, 0.1)) {
  const ancho = fuente.widthOfTextAtSize(texto, tamano);
  pagina.drawText(texto, { x: xDerecha - ancho, y, size: tamano, font: fuente, color });
}

function dibujarTextoCentrado(pagina: PDFPage, texto: string, xCentro: number, y: number, fuente: PDFFont, tamano: number, color = rgb(0.1, 0.1, 0.1)) {
  const ancho = fuente.widthOfTextAtSize(texto, tamano);
  pagina.drawText(texto, { x: xCentro - ancho / 2, y, size: tamano, font: fuente, color });
}

// Fila de una tabla de Ingresos/Descuentos: etiqueta a la izquierda,
// monto alineado a la derecha, con una linea divisoria fina debajo.
function dibujarFilaConcepto(
  pagina: PDFPage,
  x: number,
  y: number,
  ancho: number,
  etiqueta: string,
  monto: string,
  fonts: Fonts,
  negrita = false,
): void {
  const fuente = negrita ? fonts.negrita : fonts.normal;
  dibujarTexto(pagina, etiqueta, x + 8, y, fuente, 9.5);
  dibujarTextoDerecha(pagina, monto, x + ancho - 8, y, fuente, 9.5);
}

export async function generarBoletaPdf(datos: DatosBoletaPdf): Promise<Uint8Array> {
  const nroBoleta = formatearNroBoleta(datos.idPlanillaDetalle, datos.anio);
  const nombreCompleto = `${datos.nombres} ${datos.apellidos}`.toUpperCase();
  const fechaGeneracion = new Date();

  const doc = await PDFDocument.create();
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts: Fonts = { normal, negrita };
  const pagina = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  let logoImagen: PDFImage | null = null;
  if (datos.logoBytes && datos.logoFormato) {
    logoImagen = datos.logoFormato === "png" ? await doc.embedPng(datos.logoBytes) : await doc.embedJpg(datos.logoBytes);
  }

  // ---- Encabezado: logo/razon social a la izquierda, titulo al centro,
  // numero de boleta + periodo a la derecha.
  let y = PAGE_HEIGHT - MARGEN;
  if (logoImagen) {
    const altoLogo = 32;
    const escala = Math.min(altoLogo / logoImagen.height, 160 / logoImagen.width);
    pagina.drawImage(logoImagen, { x: MARGEN, y: y - altoLogo, width: logoImagen.width * escala, height: logoImagen.height * escala });
  } else {
    dibujarTexto(pagina, EMPLEADOR.razonSocial, MARGEN, y - 18, negrita, 13, COLOR_MARCA);
  }

  dibujarTextoCentrado(pagina, "BOLETA DE PAGO", PAGE_WIDTH / 2, y - 16, negrita, 15);
  dibujarTextoCentrado(pagina, `Periodo: ${datos.periodo}`, PAGE_WIDTH / 2, y - 32, normal, 9.5, COLOR_TEXTO_TENUE);

  dibujarTextoDerecha(pagina, nroBoleta, PAGE_WIDTH - MARGEN, y - 4, negrita, 10, COLOR_MARCA);
  dibujarTextoDerecha(pagina, `RUC: ${EMPLEADOR.ruc}`, PAGE_WIDTH - MARGEN, y - 16, normal, 8.5, COLOR_TEXTO_TENUE);
  dibujarTextoDerecha(pagina, `Emitido: ${formatearFechaCorta(fechaGeneracion.toISOString().slice(0, 10))}`, PAGE_WIDTH - MARGEN, y - 27, normal, 8.5, COLOR_TEXTO_TENUE);

  y -= 46;
  pagina.drawLine({ start: { x: MARGEN, y }, end: { x: PAGE_WIDTH - MARGEN, y }, thickness: 1.5, color: COLOR_MARCA });
  y -= 16;

  // ---- Bloque de identificacion: 2 columnas x 3 filas + fila de cuenta
  // de pago, con fondo suave y borde -- el formato clasico de boleta
  // siempre abre con esto. altoIdent deja ~17pt de aire debajo de la
  // ultima fila (cuenta de pago) para que no quede pegada/cortada por
  // el borde inferior del recuadro.
  const altoIdent = 92;
  pagina.drawRectangle({ x: MARGEN, y: y - altoIdent, width: ANCHO_UTIL, height: altoIdent, color: COLOR_FONDO_ENCABEZADO, borderColor: COLOR_BORDE, borderWidth: 0.75 });
  const colIzq = MARGEN + 12;
  const colDer = MARGEN + ANCHO_UTIL / 2 + 12;
  const filas: [string, string, string, string][] = [
    ["Empleador", EMPLEADOR.razonSocial, "Trabajador", nombreCompleto],
    ["RUC", EMPLEADOR.ruc, `${datos.tipoDocumentoDescripcion ?? "DNI"}`, datos.nroDocumento ?? "-"],
    ["Cargo", datos.cargo, "Sistema de pension", `${datos.sistemaPensionDescripcion ?? "-"}${datos.afpFondoDescripcion ? ` (${datos.afpFondoDescripcion})` : ""}`],
  ];
  let yFila = y - 18;
  for (const [etiqIzq, valIzq, etiqDer, valDer] of filas) {
    dibujarTexto(pagina, `${etiqIzq}:`, colIzq, yFila, negrita, 8.5);
    dibujarTexto(pagina, valIzq, colIzq + 70, yFila, normal, 8.5);
    dibujarTexto(pagina, `${etiqDer}:`, colDer, yFila, negrita, 8.5);
    dibujarTexto(pagina, valDer, colDer + 100, yFila, normal, 8.5);
    yFila -= 19;
  }
  dibujarTexto(pagina, "Cuenta de pago:", colIzq, yFila, negrita, 8.5);
  dibujarTexto(pagina, `${datos.nroCuenta ?? "-"}  |  CCI: ${datos.cci ?? "-"}  |  ${datos.banco ?? "-"}`, colIzq + 70, yFila, normal, 8.5);

  y -= altoIdent + 14;

  // ---- INGRESOS (izquierda) / DESCUENTOS (derecha), tablas gemelas.
  const anchoTabla = (ANCHO_UTIL - 16) / 2;
  const xIngresos = MARGEN;
  const xDescuentos = MARGEN + anchoTabla + 16;
  const altoEncabezadoTabla = 20;
  const altoFila = 20;
  // Detalle de ingresos por concepto (Sueldo basico, Asignacion familiar,
  // etc., segun RRHH_CONTRATO_CONCEPTO) en vez de un solo monto lumped --
  // si por algun motivo la suma de conceptos no calza con el bruto ya
  // persistido (ej. se edito el monto a mano despues), se agrega una
  // fila de ajuste para que el total de la tabla siempre calce con el
  // neto/aporte/retencion ya calculados sobre `datos.bruto`.
  const conceptosIngreso = datos.conceptosIngreso.length > 0 ? datos.conceptosIngreso : [{ descripcion: "Remuneracion", monto: datos.bruto }];
  const filasIngresos: [string, number][] = conceptosIngreso.map((c) => [c.descripcion, c.monto]);
  const sumaConceptos = conceptosIngreso.reduce((s, c) => s + c.monto, 0);
  const ajuste = Math.round((datos.bruto - sumaConceptos) * 100) / 100;
  if (Math.abs(ajuste) >= 0.01) filasIngresos.push(["Ajuste", ajuste]);
  const filasDescuentos: [string, number][] = [
    [datos.sistemaPensionDescripcion === "ONP" ? "ONP (13%)" : `AFP${datos.afpFondoDescripcion ? ` - ${datos.afpFondoDescripcion}` : ""}`, datos.aportePension],
    ["Retencion Renta de 5ta categoria", datos.retencionRenta],
  ];
  const filasCuerpo = Math.max(filasIngresos.length, filasDescuentos.length, 3);
  const altoCuerpoTabla = altoEncabezadoTabla + filasCuerpo * altoFila + altoFila; // + fila de total

  function dibujarTablaConceptos(x: number, titulo: string, filasConcepto: [string, number][], totalEtiqueta: string, total: number): void {
    let yy = y;
    pagina.drawRectangle({ x, y: yy - altoCuerpoTabla, width: anchoTabla, height: altoCuerpoTabla, borderColor: COLOR_BORDE, borderWidth: 0.75 });
    pagina.drawRectangle({ x, y: yy - altoEncabezadoTabla, width: anchoTabla, height: altoEncabezadoTabla, color: COLOR_MARCA });
    dibujarTexto(pagina, titulo, x + 8, yy - 14, negrita, 9.5, rgb(1, 1, 1));
    dibujarTextoDerecha(pagina, "MONTO", x + anchoTabla - 8, yy - 14, negrita, 8.5, rgb(1, 1, 1));
    yy -= altoEncabezadoTabla;

    for (let i = 0; i < filasCuerpo - 1; i++) {
      const fila = filasConcepto[i];
      if (fila) dibujarFilaConcepto(pagina, x, yy - 14, anchoTabla, fila[0], formatearMoneda(fila[1]), fonts);
      pagina.drawLine({ start: { x, y: yy - altoFila }, end: { x: x + anchoTabla, y: yy - altoFila }, thickness: 0.5, color: COLOR_BORDE });
      yy -= altoFila;
    }

    pagina.drawRectangle({ x, y: yy - altoFila, width: anchoTabla, height: altoFila, color: COLOR_FONDO_ENCABEZADO });
    dibujarFilaConcepto(pagina, x, yy - 14, anchoTabla, totalEtiqueta, formatearMoneda(total), fonts, true);
  }

  const totalIngresos = filasIngresos.reduce((s, [, m]) => s + m, 0);
  const totalDescuentos = filasDescuentos.reduce((s, [, m]) => s + m, 0);
  dibujarTablaConceptos(xIngresos, "INGRESOS", filasIngresos, "TOTAL INGRESOS", totalIngresos);
  dibujarTablaConceptos(xDescuentos, "DESCUENTOS", filasDescuentos, "TOTAL DESCUENTOS", totalDescuentos);

  y -= altoCuerpoTabla + 16;

  // ---- Neto a pagar, destacado.
  const altoNeto = 34;
  pagina.drawRectangle({ x: MARGEN, y: y - altoNeto, width: ANCHO_UTIL, height: altoNeto, color: COLOR_FONDO_NETO, borderColor: COLOR_VERDE, borderWidth: 1 });
  dibujarTexto(pagina, "NETO A PAGAR", MARGEN + 12, y - 22, negrita, 12, COLOR_VERDE);
  dibujarTextoDerecha(pagina, formatearMoneda(datos.neto), PAGE_WIDTH - MARGEN - 12, y - 22, negrita, 14, COLOR_VERDE);
  y -= altoNeto + 12;

  dibujarTexto(pagina, `Son: ${montoEnLetras(datos.neto)}`, MARGEN, y, negrita, 9);
  y -= 24;

  // ---- Aportes del empleador (EsSalud): cuadro propio, no una nota al
  // pie -- es un aporte real, solo que no forma parte de los descuentos
  // del colaborador ni afecta el neto a pagar.
  const altoAportes = 40;
  const altoEncabezadoAportes = 16;
  pagina.drawRectangle({ x: MARGEN, y: y - altoAportes, width: ANCHO_UTIL, height: altoAportes, borderColor: COLOR_BORDE, borderWidth: 0.75 });
  pagina.drawRectangle({ x: MARGEN, y: y - altoEncabezadoAportes, width: ANCHO_UTIL, height: altoEncabezadoAportes, color: COLOR_FONDO_ENCABEZADO });
  dibujarTexto(pagina, "APORTES DEL EMPLEADOR (no forma parte de los descuentos ni afecta el neto)", MARGEN + 8, y - 11.5, negrita, 8, COLOR_TEXTO_TENUE);
  dibujarFilaConcepto(pagina, MARGEN, y - altoEncabezadoAportes - 15, ANCHO_UTIL, "EsSalud", formatearMoneda(datos.essalud), fonts);
  y -= altoAportes;

  // ---- Firmas, al pie.
  const yFirma = MARGEN + 34;
  const anchoFirma = 220;
  pagina.drawLine({ start: { x: MARGEN, y: yFirma }, end: { x: MARGEN + anchoFirma, y: yFirma }, thickness: 0.75, color: rgb(0.2, 0.2, 0.2) });
  dibujarTextoCentrado(pagina, nombreCompleto, MARGEN + anchoFirma / 2, yFirma - 12, normal, 8.5);
  dibujarTextoCentrado(pagina, "Firma del trabajador", MARGEN + anchoFirma / 2, yFirma - 23, normal, 8, COLOR_TEXTO_TENUE);

  const xFirmaDer = PAGE_WIDTH - MARGEN - anchoFirma;
  pagina.drawLine({ start: { x: xFirmaDer, y: yFirma }, end: { x: xFirmaDer + anchoFirma, y: yFirma }, thickness: 0.75, color: rgb(0.2, 0.2, 0.2) });
  dibujarTextoCentrado(pagina, EMPLEADOR.razonSocial, xFirmaDer + anchoFirma / 2, yFirma - 12, normal, 8.5);
  dibujarTextoCentrado(pagina, "Empleador", xFirmaDer + anchoFirma / 2, yFirma - 23, normal, 8, COLOR_TEXTO_TENUE);

  // ---- Pie de pagina.
  const yPie = MARGEN - 10;
  pagina.drawLine({ start: { x: MARGEN, y: yPie }, end: { x: PAGE_WIDTH - MARGEN, y: yPie }, thickness: 1, color: COLOR_MARCA });
  dibujarTexto(pagina, EMPLEADOR.razonSocial, MARGEN, yPie - 12, normal, 7.5, COLOR_TEXTO_TENUE);
  dibujarTextoCentrado(
    pagina,
    `Generado el ${formatearFechaCorta(fechaGeneracion.toISOString().slice(0, 10))} ${String(fechaGeneracion.getHours()).padStart(2, "0")}:${String(fechaGeneracion.getMinutes()).padStart(2, "0")}`,
    PAGE_WIDTH / 2,
    yPie - 12,
    normal,
    7.5,
    COLOR_TEXTO_TENUE,
  );
  dibujarTextoDerecha(pagina, "Pagina 1 de 1", PAGE_WIDTH - MARGEN, yPie - 12, normal, 7.5, COLOR_TEXTO_TENUE);

  return doc.save();
}
