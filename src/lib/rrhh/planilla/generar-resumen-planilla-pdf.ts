import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR, formatearMoneda } from "@/lib/rrhh/plantilla-tokens";

export interface FilaResumenPdf {
  nombreCompleto: string;
  regimen: string;
  bruto: number;
  descuentos: number;
  neto: number;
  estadoEmision: string;
}

export interface DatosResumenPlanillaPdf {
  periodo: string;
  filas: FilaResumenPdf[];
  logoBytes: Uint8Array | null;
  logoFormato: "png" | "jpg" | null;
}

// Agregado de solo lectura sobre numeros ya calculados -- a diferencia de
// una boleta/RxH (documento legal por persona, se genera una vez y se
// guarda), este se regenera al vuelo cada vez que se pide (ver la ruta
// API de resumen), no se persiste.
export async function generarResumenPlanillaPdf(datos: DatosResumenPlanillaPdf): Promise<Uint8Array> {
  const writer = await PdfWriter.crear({
    logoBytes: datos.logoBytes,
    logoFormato: datos.logoFormato,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: `RESUMEN ${datos.periodo}`,
  });

  writer.titulo(`RESUMEN DE PLANILLA -- ${datos.periodo}`);

  const filasTabla = [
    "| Colaborador | Regimen | Bruto | Descuentos | Neto | Estado |",
    ...datos.filas.map(
      (f) => `| ${f.nombreCompleto} | ${f.regimen} | ${formatearMoneda(f.bruto)} | ${formatearMoneda(f.descuentos)} | ${formatearMoneda(f.neto)} | ${f.estadoEmision} |`,
    ),
  ];
  writer.parrafo(filasTabla.join("\n"), { justificar: false });

  const totalBruto = datos.filas.reduce((s, f) => s + f.bruto, 0);
  const totalDescuentos = datos.filas.reduce((s, f) => s + f.descuentos, 0);
  const totalNeto = datos.filas.reduce((s, f) => s + f.neto, 0);

  writer.espacio(6);
  writer.parrafo(
    [
      "| Total | Monto |",
      `| Bruto total | ${formatearMoneda(totalBruto)} |`,
      `| Descuentos totales | ${formatearMoneda(totalDescuentos)} |`,
      `| Neto total | ${formatearMoneda(totalNeto)} |`,
      `| Colaboradores | ${datos.filas.length} |`,
    ].join("\n"),
    { justificar: false, negrita: true },
  );

  return writer.bytes();
}
