import { PdfWriter } from "@/lib/rrhh/pdf-writer";
import { EMPLEADOR } from "@/lib/rrhh/plantilla-tokens";

// "Solicitud de registro de contrato": formato en blanco que genera el
// propio sistema para el flujo de importacion (contratos ya firmados en
// papel, ver 042_rrhh_contrato_importacion.sql). Se imprime, se llena a
// mano, se firma, y se vuelve a subir escaneada -- extraer-solicitud-
// contrato.ts describe este MISMO layout/orden de campos al modelo que
// lee el escaneo, asi que un cambio aca (agregar/quitar/reordenar un
// campo) debe reflejarse tambien alla.
const LINEA_EN_BLANCO = "___________________________";

export async function generarSolicitudContratoPdf(): Promise<Uint8Array> {
  const writer = await PdfWriter.crear({
    logoBytes: null,
    logoFormato: null,
    razonSocial: EMPLEADOR.razonSocial,
    ruc: EMPLEADOR.ruc,
    telefono: EMPLEADOR.telefono,
    correo: EMPLEADOR.correo,
    nroContrato: "SOLICITUD",
  });

  writer.titulo("SOLICITUD DE REGISTRO DE CONTRATO");
  writer.parrafo(
    "Completar a mano con letra clara, firmar y entregar a Recursos Humanos junto con el contrato ya firmado (o en su reemplazo, si este formato hace las veces de contrato). Los campos que no correspondan se dejan en blanco.",
    { justificar: false, tamano: 9 },
  );

  writer.subtitulo("1. Datos del colaborador");
  writer.parrafo(
    [
      `| Nombres y apellidos | ${LINEA_EN_BLANCO} |`,
      `| Tipo y numero de documento | ${LINEA_EN_BLANCO} |`,
      `| Cargo | ${LINEA_EN_BLANCO} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("2. Tipo de contrato (marcar uno)");
  writer.parrafo(
    "[  ] Planilla full-time     [  ] Planilla part-time     [  ] Locador de servicios",
    { justificar: false },
  );
  writer.parrafo(
    "Si es Locador de servicios, tipo de pago:  [  ] Mensual   [  ] Por jornada   [  ] Por proyecto   [  ] Por hora",
    { justificar: false, tamano: 9 },
  );

  writer.subtitulo("3. Vigencia");
  writer.parrafo(
    [`| Fecha de inicio | ${LINEA_EN_BLANCO} |`, `| Fecha de fin (o "indefinido") | ${LINEA_EN_BLANCO} |`].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("4. Jornada (solo Planilla)");
  writer.parrafo(
    [`| Dias laborales | ${LINEA_EN_BLANCO} |`, `| Horario | de ______ a ______ |`].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("5. Remuneracion / tarifa");
  writer.parrafo("Si es Planilla, detallar los conceptos remunerativos:", { justificar: false, tamano: 9 });
  writer.parrafo(
    [
      "| Concepto | Monto (S/) |",
      `| ${LINEA_EN_BLANCO} | ${LINEA_EN_BLANCO} |`,
      `| ${LINEA_EN_BLANCO} | ${LINEA_EN_BLANCO} |`,
      `| ${LINEA_EN_BLANCO} | ${LINEA_EN_BLANCO} |`,
    ].join("\n"),
    { justificar: false },
  );
  writer.parrafo("Si es Locador de servicios (no por hora):", { justificar: false, tamano: 9 });
  writer.parrafo(
    [
      `| Tarifa | ${LINEA_EN_BLANCO} |`,
      "| Moneda | [  ] Soles     [  ] Dolares |",
      `| Periodo de pago (ej. "MENSUAL" o rango de fechas) | ${LINEA_EN_BLANCO} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("6. Datos bancarios");
  writer.parrafo(
    [
      `| N° de cuenta | ${LINEA_EN_BLANCO} |`,
      `| CCI | ${LINEA_EN_BLANCO} |`,
      `| Banco | ${LINEA_EN_BLANCO} |`,
    ].join("\n"),
    { justificar: false },
  );

  writer.subtitulo("7. Firmas");
  writer.parrafo(`Fecha de firma: ${LINEA_EN_BLANCO}`, { justificar: false });
  writer.espacio(20);

  await writer.firmasEnColumnas(
    { nombre: "Firma del colaborador", rol: "Colaborador", firmaPngBytes: null },
    { nombre: "Firma del empleador", rol: EMPLEADOR.razonSocial, firmaPngBytes: null },
  );

  return writer.bytes();
}
