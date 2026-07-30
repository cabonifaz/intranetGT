import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";

const PAGE_WIDTH = 595.28; // A4 en puntos
const PAGE_HEIGHT = 841.89;
const MARGEN = 56;
const ANCHO_UTIL = PAGE_WIDTH - MARGEN * 2;
const ALTO_ENCABEZADO = 74;
const ALTO_PIE = 34;
const COLOR_MARCA = rgb(0.15, 0.35, 0.75);
const COLOR_TEXTO_TENUE = rgb(0.45, 0.45, 0.45);
const COLOR_BORDE_SUAVE = rgb(0.82, 0.82, 0.82);

// Envuelve texto en lineas que no superen anchoMax, usando el ancho real
// de cada palabra en la fuente/tamano dados (pdf-lib no hace wrap solo).
function envolverTexto(texto: string, fuente: PDFFont, tamano: number, anchoMax: number): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let lineaActual = "";

  for (const palabra of palabras) {
    const candidata = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(candidata, tamano) > anchoMax && lineaActual) {
      lineas.push(lineaActual);
      lineaActual = palabra;
    } else {
      lineaActual = candidata;
    }
  }
  if (lineaActual) lineas.push(lineaActual);
  return lineas;
}

// Sintaxis tipo tabla Markdown para las clausulas de plantilla: una linea
// "| celda | celda |" (dentro del CONTENIDO de una clausula, o generada
// por un token como {{DETALLE_PAGO_FILAS}}) se detecta y renderiza como
// fila de tabla con bordes en vez de texto corrido -- ver parrafo().
function parseFilaTabla(linea: string): string[] | null {
  const t = linea.trim();
  if (!t.startsWith("|") || !t.endsWith("|") || t.length < 2) return null;
  return t
    .slice(1, -1)
    .split("|")
    .map((celda) => celda.trim());
}

export interface EncabezadoConfig {
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
  razonSocial: string;
  ruc: string;
  telefono: string;
  correo: string;
  nroContrato: string;
}

export class PdfWriter {
  private doc: PDFDocument;
  private pagina!: PDFPage;
  private y = 0;
  private fuenteNormal!: PDFFont;
  private fuenteNegrita!: PDFFont;
  private encabezado: EncabezadoConfig | null = null;
  private logoImagen: PDFImage | null = null;
  private readonly fechaGeneracion = new Date();

  private constructor(doc: PDFDocument) {
    this.doc = doc;
  }

  static async crear(encabezado?: EncabezadoConfig): Promise<PdfWriter> {
    const writer = new PdfWriter(await PDFDocument.create());
    writer.fuenteNormal = await writer.doc.embedFont(StandardFonts.Helvetica);
    writer.fuenteNegrita = await writer.doc.embedFont(StandardFonts.HelveticaBold);

    if (encabezado) {
      writer.encabezado = encabezado;
      if (encabezado.logoBytes && encabezado.logoFormato) {
        writer.logoImagen =
          encabezado.logoFormato === "png"
            ? await writer.doc.embedPng(encabezado.logoBytes)
            : await writer.doc.embedJpg(encabezado.logoBytes);
      }
    }

    writer.nuevaPagina();
    return writer;
  }

  private nuevaPagina(): void {
    this.pagina = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGEN;
    this.dibujarEncabezado();
  }

  // Logo a la izquierda; numero de contrato + datos de contacto apilados
  // a la derecha (en ese orden, nunca cerca del logo -- un logo ancho no
  // debe poder pisar el numero de contrato); linea de marca debajo.
  // Se repite en cada pagina, no solo la primera.
  private dibujarEncabezado(): void {
    if (!this.encabezado) return;
    const yTope = PAGE_HEIGHT - MARGEN;

    if (this.logoImagen) {
      const altoLogo = 34;
      const anchoMaxLogo = ANCHO_UTIL * 0.45;
      const escala = Math.min(altoLogo / this.logoImagen.height, anchoMaxLogo / this.logoImagen.width);
      const anchoLogo = this.logoImagen.width * escala;
      const altoReal = this.logoImagen.height * escala;
      this.pagina.drawImage(this.logoImagen, {
        x: MARGEN,
        y: yTope - 8 - altoReal,
        width: anchoLogo,
        height: altoReal,
      });
    } else {
      this.pagina.drawText(this.encabezado.razonSocial, {
        x: MARGEN,
        y: yTope - 20,
        size: 12,
        font: this.fuenteNegrita,
        color: COLOR_MARCA,
      });
    }

    const tamCodigo = 9;
    const tamInfo = 8;
    const interlineadoInfo = tamInfo + 4;
    const bloqueDerecho = [
      { texto: this.encabezado.nroContrato, tam: tamCodigo, fuente: this.fuenteNegrita, color: COLOR_MARCA },
      { texto: `RUC: ${this.encabezado.ruc}`, tam: tamInfo, fuente: this.fuenteNormal, color: COLOR_TEXTO_TENUE },
      { texto: `Telf: ${this.encabezado.telefono}`, tam: tamInfo, fuente: this.fuenteNormal, color: COLOR_TEXTO_TENUE },
      { texto: this.encabezado.correo, tam: tamInfo, fuente: this.fuenteNormal, color: COLOR_TEXTO_TENUE },
    ].filter((linea) => linea.texto);

    let yLinea = yTope - 4;
    for (const linea of bloqueDerecho) {
      const ancho = linea.fuente.widthOfTextAtSize(linea.texto, linea.tam);
      this.pagina.drawText(linea.texto, {
        x: PAGE_WIDTH - MARGEN - ancho,
        y: yLinea,
        size: linea.tam,
        font: linea.fuente,
        color: linea.color,
      });
      yLinea -= interlineadoInfo;
    }

    this.pagina.drawLine({
      start: { x: MARGEN, y: yTope - ALTO_ENCABEZADO },
      end: { x: PAGE_WIDTH - MARGEN, y: yTope - ALTO_ENCABEZADO },
      thickness: 1.5,
      color: COLOR_MARCA,
    });

    this.y = yTope - ALTO_ENCABEZADO - 20;
  }

  private asegurarEspacio(alto: number): void {
    if (this.y - alto < MARGEN + ALTO_PIE) {
      this.nuevaPagina();
    }
  }

  titulo(texto: string): void {
    const tamano = 13;
    this.asegurarEspacio(tamano + 18);
    const ancho = this.fuenteNegrita.widthOfTextAtSize(texto, tamano);
    this.pagina.drawText(texto, {
      x: (PAGE_WIDTH - ancho) / 2,
      y: this.y,
      size: tamano,
      font: this.fuenteNegrita,
    });
    this.y -= tamano + 22;
  }

  subtitulo(texto: string): void {
    const tamano = 10.5;
    this.asegurarEspacio(tamano + 14);
    this.espacio(6);
    this.pagina.drawText(texto, { x: MARGEN, y: this.y, size: tamano, font: this.fuenteNegrita, color: COLOR_MARCA });
    this.y -= tamano + 8;
  }

  // Los saltos de linea explicitos ("\n") se respetan como parrafos/lineas
  // separadas -- necesario para bloques generados dinamicamente como el
  // detalle de conceptos remunerativos o de proyectos con tarifa, que
  // llegan como texto multilinea desde reemplazarTokens(). Cada bloque se
  // justifica (ambos margenes parejos, como un documento legal impreso),
  // salvo su ultima linea, que se deja alineada a la izquierda -- la
  // convencion tipografica habitual, y evita estirar de mas lineas cortas
  // (ej. items de una lista de un solo renglon, que nunca se justifican).
  // Las lineas con formato "| celda | celda |" se agrupan y dibujan como
  // tabla (ver tabla()) en vez de texto.
  parrafo(texto: string, opciones: { tamano?: number; negrita?: boolean; justificar?: boolean } = {}): void {
    const tamano = opciones.tamano ?? 10;
    const fuente = opciones.negrita ? this.fuenteNegrita : this.fuenteNormal;
    const interlineado = tamano + 5;
    const justificar = opciones.justificar ?? true;

    let filasTabla: string[][] = [];
    const descargarTabla = () => {
      if (filasTabla.length > 0) {
        this.tabla(filasTabla);
        filasTabla = [];
      }
    };

    for (const bloque of texto.split("\n")) {
      const filaTabla = parseFilaTabla(bloque);
      if (filaTabla) {
        filasTabla.push(filaTabla);
        continue;
      }
      descargarTabla();

      if (!bloque.trim()) continue;

      const lineas = envolverTexto(bloque, fuente, tamano, ANCHO_UTIL);
      lineas.forEach((linea, indice) => {
        this.asegurarEspacio(interlineado);
        const esUltimaLineaDelBloque = indice === lineas.length - 1;
        if (justificar && !esUltimaLineaDelBloque) {
          this.dibujarLineaJustificada(linea, fuente, tamano);
        } else {
          this.pagina.drawText(linea, { x: MARGEN, y: this.y, size: tamano, font: fuente });
        }
        this.y -= interlineado;
      });
    }
    descargarTabla();
    this.y -= 6;
  }

  // Tabla con bordes: 2 columnas se tratan como clave/valor (primera
  // columna en negrita, resaltada); 3+ columnas tratan la primera fila
  // como encabezado (negrita, resaltada) y el resto como datos. Calcula
  // el alto de cada fila segun la celda con mas lineas, para que texto
  // largo (ej. funciones) no se recorte.
  private tabla(filas: string[][]): void {
    if (filas.length === 0) return;
    const numCols = filas[0].length;
    const esClaveValor = numCols === 2;
    const anchosCol = esClaveValor
      ? [ANCHO_UTIL * 0.34, ANCHO_UTIL * 0.66]
      : filas[0].map(() => ANCHO_UTIL / numCols);
    const tamano = 9;
    const padding = 6;
    const interlineado = tamano + 3;

    filas.forEach((fila, indiceFila) => {
      const esFilaEncabezado = !esClaveValor && indiceFila === 0;

      const celdas = fila.map((valor, indiceCol) => {
        const resaltada = esFilaEncabezado || (esClaveValor && indiceCol === 0);
        const fuente = resaltada ? this.fuenteNegrita : this.fuenteNormal;
        const ancho = anchosCol[indiceCol] ?? ANCHO_UTIL / numCols;
        return { lineas: envolverTexto(valor, fuente, tamano, ancho - padding * 2), fuente, resaltada, ancho };
      });
      const maxLineas = Math.max(1, ...celdas.map((c) => c.lineas.length));
      const altoFila = maxLineas * interlineado + padding * 1.6;

      this.asegurarEspacio(altoFila);
      const yTop = this.y;
      let x = MARGEN;

      celdas.forEach((celda) => {
        this.pagina.drawRectangle({
          x,
          y: yTop - altoFila,
          width: celda.ancho,
          height: altoFila,
          borderColor: COLOR_BORDE_SUAVE,
          borderWidth: 0.75,
          color: celda.resaltada ? rgb(0.93, 0.96, 0.99) : rgb(1, 1, 1),
        });

        let yTexto = yTop - padding - tamano * 0.85;
        for (const linea of celda.lineas) {
          this.pagina.drawText(linea, { x: x + padding, y: yTexto, size: tamano, font: celda.fuente });
          yTexto -= interlineado;
        }
        x += celda.ancho;
      });

      this.y = yTop - altoFila;
    });

    this.y -= 8;
  }

  private dibujarLineaJustificada(linea: string, fuente: PDFFont, tamano: number): void {
    const palabras = linea.split(" ").filter(Boolean);
    if (palabras.length < 2) {
      this.pagina.drawText(linea, { x: MARGEN, y: this.y, size: tamano, font: fuente });
      return;
    }

    const anchoPalabras = palabras.reduce((suma, palabra) => suma + fuente.widthOfTextAtSize(palabra, tamano), 0);
    const huecos = palabras.length - 1;
    const espacioPorHueco = (ANCHO_UTIL - anchoPalabras) / huecos;

    let x = MARGEN;
    palabras.forEach((palabra, indice) => {
      this.pagina.drawText(palabra, { x, y: this.y, size: tamano, font: fuente });
      x += fuente.widthOfTextAtSize(palabra, tamano) + (indice < huecos ? espacioPorHueco : 0);
    });
  }

  espacio(alto = 10): void {
    this.y -= alto;
  }

  // Bloque de firma como recuadro con borde (nombre/etiqueta + documento +
  // imagen de la firma si la hay, ej. la del representante legal no se
  // captura digitalmente hoy, solo se imprime su nombre).
  async firmaEnRecuadro(opciones: {
    etiqueta: string;
    nombreParte: string;
    identificacion: string;
    firmaPngBytes: Uint8Array | null;
  }): Promise<void> {
    const altoBox = 76;
    this.asegurarEspacio(altoBox + 10);

    const yTopBox = this.y;
    const yBottomBox = this.y - altoBox;

    this.pagina.drawRectangle({
      x: MARGEN,
      y: yBottomBox,
      width: ANCHO_UTIL,
      height: altoBox,
      borderColor: COLOR_BORDE_SUAVE,
      borderWidth: 1,
      color: rgb(0.985, 0.985, 0.99),
    });

    if (opciones.firmaPngBytes) {
      const imagen = await this.doc.embedPng(opciones.firmaPngBytes);
      const altoImg = 30;
      const escala = altoImg / imagen.height;
      const anchoImg = Math.min(imagen.width * escala, ANCHO_UTIL - 20);
      this.pagina.drawImage(imagen, {
        x: MARGEN + 12,
        y: yTopBox - 12 - altoImg,
        width: anchoImg,
        height: altoImg,
      });
    }

    const tam = 9;
    this.pagina.drawLine({
      start: { x: MARGEN + 12, y: yBottomBox + 32 },
      end: { x: MARGEN + ANCHO_UTIL - 12, y: yBottomBox + 32 },
      thickness: 0.5,
      color: COLOR_BORDE_SUAVE,
    });
    this.pagina.drawText(`${opciones.etiqueta}: ${opciones.nombreParte}`, {
      x: MARGEN + 12,
      y: yBottomBox + 22,
      size: tam,
      font: this.fuenteNegrita,
    });
    this.pagina.drawText(opciones.identificacion, {
      x: MARGEN + 12,
      y: yBottomBox + 9,
      size: tam,
      font: this.fuenteNormal,
      color: COLOR_TEXTO_TENUE,
    });

    this.y = yBottomBox - 14;
  }

  // Firmas lado a lado sin recuadro (imagen de firma sobre una linea +
  // nombre + rol debajo, centrado en cada columna) -- estilo usado en los
  // acuerdos de locador, a diferencia del recuadro con borde de planilla.
  async firmasEnColumnas(
    izquierda: { nombre: string; rol: string; firmaPngBytes: Uint8Array | null },
    derecha: { nombre: string; rol: string; firmaPngBytes: Uint8Array | null },
  ): Promise<void> {
    const altoBloque = 90;
    this.asegurarEspacio(altoBloque);

    const espacioEntreColumnas = 30;
    const anchoCol = (ANCHO_UTIL - espacioEntreColumnas) / 2;
    const yTop = this.y;

    await this.dibujarColumnaFirma(izquierda, MARGEN, yTop, anchoCol);
    await this.dibujarColumnaFirma(derecha, MARGEN + anchoCol + espacioEntreColumnas, yTop, anchoCol);

    this.y = yTop - altoBloque;
  }

  private async dibujarColumnaFirma(
    datos: { nombre: string; rol: string; firmaPngBytes: Uint8Array | null },
    x: number,
    yTop: number,
    ancho: number,
  ): Promise<void> {
    const altoEspacioFirma = 36;
    const yLinea = yTop - altoEspacioFirma;

    if (datos.firmaPngBytes) {
      const imagen = await this.doc.embedPng(datos.firmaPngBytes);
      const escala = Math.min(altoEspacioFirma / imagen.height, ancho / imagen.width);
      const anchoImg = imagen.width * escala;
      const altoImg = imagen.height * escala;
      this.pagina.drawImage(imagen, {
        x: x + (ancho - anchoImg) / 2,
        y: yLinea + (altoEspacioFirma - altoImg) / 2,
        width: anchoImg,
        height: altoImg,
      });
    }

    this.pagina.drawLine({
      start: { x, y: yLinea },
      end: { x: x + ancho, y: yLinea },
      thickness: 0.75,
      color: rgb(0.2, 0.2, 0.2),
    });

    const tam = 9;
    const anchoNombre = this.fuenteNegrita.widthOfTextAtSize(datos.nombre, tam);
    this.pagina.drawText(datos.nombre, {
      x: x + Math.max(0, (ancho - anchoNombre) / 2),
      y: yLinea - 14,
      size: tam,
      font: this.fuenteNegrita,
    });

    const anchoRol = this.fuenteNormal.widthOfTextAtSize(datos.rol, tam - 0.5);
    this.pagina.drawText(datos.rol, {
      x: x + Math.max(0, (ancho - anchoRol) / 2),
      y: yLinea - 26,
      size: tam - 0.5,
      font: this.fuenteNormal,
      color: COLOR_TEXTO_TENUE,
    });
  }

  // Pie de pagina (linea de marca + razon social a la izquierda + fecha de
  // generacion al centro + "Pagina i de N" a la derecha) en todas las
  // paginas ya creadas -- se dibuja al final porque el total de paginas
  // no se conoce hasta haber escrito todo el contenido.
  async bytes(): Promise<Uint8Array> {
    const paginas = this.doc.getPages();
    const total = paginas.length;
    const razonSocial = this.encabezado?.razonSocial ?? "";
    const fechaTexto = `Generado el ${this.formatearFechaGeneracion()}`;

    paginas.forEach((pagina, indice) => {
      const yLinea = MARGEN - 12;
      const tam = 7.5;

      pagina.drawLine({
        start: { x: MARGEN, y: yLinea },
        end: { x: PAGE_WIDTH - MARGEN, y: yLinea },
        thickness: 1,
        color: COLOR_MARCA,
      });

      if (razonSocial) {
        pagina.drawText(razonSocial, {
          x: MARGEN,
          y: yLinea - 12,
          size: tam,
          font: this.fuenteNormal,
          color: COLOR_TEXTO_TENUE,
        });
      }

      const anchoFecha = this.fuenteNormal.widthOfTextAtSize(fechaTexto, tam);
      pagina.drawText(fechaTexto, {
        x: (PAGE_WIDTH - anchoFecha) / 2,
        y: yLinea - 12,
        size: tam,
        font: this.fuenteNormal,
        color: COLOR_TEXTO_TENUE,
      });

      const textoPagina = `Página ${indice + 1} de ${total}`;
      const anchoPagina = this.fuenteNormal.widthOfTextAtSize(textoPagina, tam);
      pagina.drawText(textoPagina, {
        x: PAGE_WIDTH - MARGEN - anchoPagina,
        y: yLinea - 12,
        size: tam,
        font: this.fuenteNormal,
        color: COLOR_TEXTO_TENUE,
      });
    });

    return this.doc.save();
  }

  private formatearFechaGeneracion(): string {
    const f = this.fechaGeneracion;
    const dd = String(f.getDate()).padStart(2, "0");
    const mm = String(f.getMonth() + 1).padStart(2, "0");
    const hh = String(f.getHours()).padStart(2, "0");
    const min = String(f.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${f.getFullYear()} ${hh}:${min}`;
  }
}
