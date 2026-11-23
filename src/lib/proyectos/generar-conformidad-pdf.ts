import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR, formatearFechaCorta } from "@/lib/rrhh/plantilla-tokens";

// Documento de conformidad de un hito de facturacion: 1 o varios
// firmantes dan conformidad al entregable descrito en los items, y esa(s)
// firma(s) son el respaldo para poder marcar el hito como facturado (ver
// guard en SP_PROYECTO_HITO_MARCAR_FACTURADO). Se genera al emitir (sin
// firmantes todavia, queda como DOCUMENTO_PATH) y se regenera cada vez
// que alguien firma (con el estado actual de TODOS los firmantes, ver
// regenerarDocumentoFirmadoConformidad, queda como DOCUMENTO_FIRMADO_PATH)
// -- mismo criterio que generar-compromiso-prestamo-pdf.ts. La empresa
// nunca firma digitalmente, solo se imprime el nombre de su
// representante (mismo criterio que Contratos/Prestamos).

function formatearNroConformidad(idConformidad: number): string {
  return `CONF#${new Date().getFullYear()}-${String(idConformidad).padStart(4, "0")}`;
}

function moneda(monto: number, codigo: string): string {
  const simbolo = codigo === "USD" ? "US$" : "S/";
  return `${simbolo} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface ItemConformidadPdf {
  descripcion: string;
}

// Un firmante en el PDF: firmaPngBytes null si todavia no firmo (su
// casillero sale con la linea en blanco, igual que la fila de la
// empresa) -- el documento combinado se regenera cada vez que alguien
// firma, asi que siempre refleja el estado actual de TODOS los
// firmantes, no solo del que acaba de firmar.
export interface FirmanteConformidadPdf {
  nombre: string;
  cargo: string | null;
  firmaPngBytes: Uint8Array | null;
}

export interface DatosConformidadPdf {
  idConformidad: number;
  titulo: string;
  nombreProyecto: string;
  clienteRazonSocial: string | null;
  clienteRuc: string | null;
  hitoNombre: string;
  hitoMonto: number;
  monedaCodigo: string;
  fechaEmision: string | null;
  items: ItemConformidadPdf[];
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
  // Firmantes del lado cliente, en el orden en que deben imprimirse.
  // Vacio durante la vista previa sin firmar que se genera al Emitir
  // (todavia no se agrego a nadie).
  firmantes: FirmanteConformidadPdf[];
}

export async function generarConformidadPdf(datos: DatosConformidadPdf): Promise<Uint8Array> {
  const nroConformidad = formatearNroConformidad(datos.idConformidad);

  const writer = await PdfWriter.crear({
    logoBytes: datos.logoBytes,
    logoFormato: datos.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: nroConformidad,
  });

  writer.titulo("DOCUMENTO DE CONFORMIDAD");
  writer.subtitulo(datos.titulo);

  writer.parrafo(
    [
      `| Proyecto | ${datos.nombreProyecto} |`,
      `| Cliente | ${datos.clienteRazonSocial ?? "-"} |`,
      `| RUC | ${datos.clienteRuc ?? "-"} |`,
      `| Entregable / hito | ${datos.hitoNombre} |`,
      `| Monto | ${moneda(datos.hitoMonto, datos.monedaCodigo)} |`,
      `| Fecha de emisión | ${datos.fechaEmision ? formatearFechaCorta(datos.fechaEmision) : "-"} |`,
    ].join("\n"),
    { justificar: false },
  );

  const declaracion =
    datos.firmantes.length > 1
      ? `Con la firma de este documento, LOS FIRMANTES declaran haber recibido y revisado el entregable descrito a continuación, ` +
        `y otorgan su conformidad a ${EMPLEADOR.razonSocial} para efectos de la facturación correspondiente a este hito. ` +
        `La conformidad se considera completa solo cuando TODOS los firmantes indicados al pie hayan firmado.`
      : `Con la firma de este documento, EL CLIENTE declara haber recibido y revisado el entregable descrito a continuación, ` +
        `y otorga su conformidad a ${EMPLEADOR.razonSocial} para efectos de la facturación correspondiente a este hito.`;
  writer.parrafo(declaracion);

  writer.subtitulo("Items de la conformidad");
  const filasItems = datos.items.map((item, i) => `| ${i + 1} | ${item.descripcion} |`);
  writer.parrafo(["| N° | Descripción |", ...filasItems].join("\n"), { justificar: false });

  writer.espacio(14);

  const rolCliente = `POR EL CLIENTE${datos.clienteRuc ? ` - RUC ${datos.clienteRuc}` : ""}`;
  await writer.firmasEnGrid(
    { nombre: EMPLEADOR.representanteNombre, rol: `POR ${EMPLEADOR.razonSocial}`, firmaPngBytes: null },
    datos.firmantes.length > 0
      ? datos.firmantes.map((f) => ({
          nombre: f.nombre,
          rol: f.cargo ? `${f.cargo} -- ${rolCliente}` : rolCliente,
          firmaPngBytes: f.firmaPngBytes,
        }))
      : [{ nombre: datos.clienteRazonSocial ?? "Cliente", rol: rolCliente, firmaPngBytes: null }],
  );

  return writer.bytes();
}
