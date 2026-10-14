import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR, formatearFechaCorta } from "@/lib/rrhh/plantilla-tokens";

// Documento de conformidad de un hito de facturacion: el cliente firma
// dando conformidad al entregable descrito en los items, y esa firma es
// el respaldo para poder marcar el hito como facturado (ver guard en
// SP_PROYECTO_HITO_MARCAR_FACTURADO). Se genera dos veces: al emitir (sin
// firma, queda como DOCUMENTO_PATH) y al firmar por el link publico (con
// firmaClientePngBytes, queda como DOCUMENTO_FIRMADO_PATH) -- mismo
// criterio que generar-compromiso-prestamo-pdf.ts. La empresa nunca
// firma digitalmente, solo se imprime el nombre de su representante
// (mismo criterio que Contratos/Prestamos).

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
  // Firma dibujada/subida por el cliente via el link publico -- null para
  // la vista previa sin firmar (el documento que se genera al Emitir).
  firmaClientePngBytes?: Uint8Array | null;
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

  writer.parrafo(
    `Con la firma de este documento, EL CLIENTE declara haber recibido y revisado el entregable descrito a continuación, ` +
      `y otorga su conformidad a ${EMPLEADOR.razonSocial} para efectos de la facturación correspondiente a este hito.`,
  );

  writer.subtitulo("Items de la conformidad");
  const filasItems = datos.items.map((item, i) => `| ${i + 1} | ${item.descripcion} |`);
  writer.parrafo(["| N° | Descripción |", ...filasItems].join("\n"), { justificar: false });

  writer.espacio(14);

  await writer.firmasEnColumnas(
    { nombre: EMPLEADOR.representanteNombre, rol: `POR ${EMPLEADOR.razonSocial}`, firmaPngBytes: null },
    {
      nombre: datos.clienteRazonSocial ?? "Cliente",
      rol: `POR EL CLIENTE${datos.clienteRuc ? ` - RUC ${datos.clienteRuc}` : ""}`,
      firmaPngBytes: datos.firmaClientePngBytes ?? null,
    },
  );

  return writer.bytes();
}
