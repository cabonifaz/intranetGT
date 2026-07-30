import { montoEnLetras } from "./numero-a-letras";
import type { DatosContratoPdf } from "./generar-contrato-pdf";

// Datos fijos de la empresa. Un solo tenant por ahora -- si en el futuro
// hace falta mas de una razon social, esto se mueve a una tabla propia.
export const EMPLEADOR = {
  razonSocial: "GEEKY TECH S.A.C.",
  ruc: "20608337602",
  domicilio: "Cal. Soldado Manuel Castañeda Nro. 239 Dpto. 1202, Urb. Fundo Lince, Distrito, Provincia y Departamento de Lima",
  representanteNombre: "Cris Alan Bonifaz Menacho",
  representanteDni: "43989632",
  telefono: "919 292 352",
  correo: "administracion@geeky-tech.es",
  giroNegocio: "la venta de equipos informáticos, desarrollo de software y servicios tecnológicos",
};

const ETIQUETA_PAGO_LOCADOR: Record<string, string> = {
  POR_HORA: "Pago por hora",
  POR_PROYECTO: "Monto fijo del proyecto",
  MENSUAL: "Pago mensual",
  POR_JORNADA: "Pago por jornada diaria",
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function formatearFechaLarga(fechaIso: string): string {
  const fecha = new Date(`${fechaIso}T00:00:00`);
  return fecha.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

// "2025-05-21" -> "21/05/2025" -- formato usado en los acuerdos de
// locador (a diferencia de los contratos de planilla, que usan fecha
// larga en el cierre).
export function formatearFechaCorta(fechaIso: string): string {
  const fecha = new Date(`${fechaIso}T00:00:00`);
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

function formatearFechaCortaDesdeDate(fecha: Date): string {
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

export function formatearMoneda(monto: number | null): string {
  if (monto === null) return "S/ 0.00";
  return `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// "08:00:00" (TIME de MySQL) o "08:00" -> "08:00 a.m.".
export function formatearHora12(horaHHMM: string | null): string {
  if (!horaHHMM) return "-";
  const [horaStr, minStr] = horaHHMM.split(":");
  const hora24 = Number(horaStr);
  const minutos = (minStr ?? "00").padStart(2, "0");
  const periodo = hora24 < 12 ? "a.m." : "p.m.";
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  return `${String(hora12).padStart(2, "0")}:${minutos} ${periodo}`;
}

// CONT#2026-0007 -- puramente informativo/autogenerado, no se guarda en
// BD: se recalcula desde ID_CONTRATO + el año de creacion cada vez.
export function formatearNroContrato(idContrato: number, fechaCreacion: Date): string {
  return `CONT#${fechaCreacion.getFullYear()}-${String(idContrato).padStart(4, "0")}`;
}

// Placeholders disponibles en el texto de una plantilla (parrafo intro y
// clausulas): {{NOMBRE_TOKEN}}. Documentados tambien en la UI de
// /rrhh/contratos/plantillas para que RRHH sepa que puede usar.
export interface TokensContrato {
  EMPLEADOR_RAZON_SOCIAL: string;
  EMPLEADOR_RUC: string;
  EMPLEADOR_DOMICILIO: string;
  EMPLEADOR_REPRESENTANTE: string;
  EMPLEADOR_REPRESENTANTE_DNI: string;
  EMPLEADOR_TELEFONO: string;
  EMPLEADOR_CORREO: string;
  EMPLEADOR_GIRO_NEGOCIO: string;
  NOMBRE_COMPLETO: string;
  TIPO_DOCUMENTO: string;
  NRO_DOCUMENTO: string;
  DIRECCION: string;
  PAIS: string;
  CIUDAD: string;
  CARGO: string;
  CARGO_MAYUSCULAS: string;
  FUNCIONES: string;
  FECHA_INICIO: string;
  FECHA_INICIO_CORTA: string;
  FECHA_FIN: string;
  FECHA_FIN_CORTA: string;
  FECHA_FIRMA: string;
  FECHA_FIRMA_CORTA: string;
  FECHA_FIRMA_DIA: string;
  FECHA_FIRMA_MES: string;
  FECHA_FIRMA_ANIO: string;
  NRO_CONTRATO: string;
  // PLANILLA
  DETALLE_REMUNERACION: string;
  TOTAL_REMUNERACION: string;
  TOTAL_REMUNERACION_LETRAS: string;
  DIAS_LABORALES: string;
  HORA_INICIO: string;
  HORA_FIN: string;
  NOTA_JORNADA: string;
  // LOCADOR
  DETALLE_PAGO: string;
  DETALLE_PAGO_FILAS: string;
  NRO_CUENTA: string;
  CCI: string;
  BANCO: string;
}

export const NOMBRES_TOKENS = Object.keys({
  EMPLEADOR_RAZON_SOCIAL: "",
  EMPLEADOR_RUC: "",
  EMPLEADOR_DOMICILIO: "",
  EMPLEADOR_REPRESENTANTE: "",
  EMPLEADOR_REPRESENTANTE_DNI: "",
  EMPLEADOR_TELEFONO: "",
  EMPLEADOR_CORREO: "",
  EMPLEADOR_GIRO_NEGOCIO: "",
  NOMBRE_COMPLETO: "",
  TIPO_DOCUMENTO: "",
  NRO_DOCUMENTO: "",
  DIRECCION: "",
  PAIS: "",
  CIUDAD: "",
  CARGO: "",
  CARGO_MAYUSCULAS: "",
  FUNCIONES: "",
  FECHA_INICIO: "",
  FECHA_INICIO_CORTA: "",
  FECHA_FIN: "",
  FECHA_FIN_CORTA: "",
  FECHA_FIRMA: "",
  FECHA_FIRMA_CORTA: "",
  FECHA_FIRMA_DIA: "",
  FECHA_FIRMA_MES: "",
  FECHA_FIRMA_ANIO: "",
  NRO_CONTRATO: "",
  DETALLE_REMUNERACION: "",
  TOTAL_REMUNERACION: "",
  TOTAL_REMUNERACION_LETRAS: "",
  DIAS_LABORALES: "",
  HORA_INICIO: "",
  HORA_FIN: "",
  NOTA_JORNADA: "",
  DETALLE_PAGO: "",
  DETALLE_PAGO_FILAS: "",
  NRO_CUENTA: "",
  CCI: "",
  BANCO: "",
} satisfies TokensContrato) as (keyof TokensContrato)[];

export function construirTokens(datos: DatosContratoPdf): TokensContrato {
  const totalConceptos = datos.conceptos.reduce((suma, c) => suma + c.monto, 0);
  const detalleRemuneracion = datos.conceptos.map((c) => `- ${c.descripcion}: ${formatearMoneda(c.monto)}`).join("\n");

  let detallePago: string;
  let detallePagoFilas: string;
  if (datos.tipoPagoLocadorCodigo === "POR_HORA") {
    detallePago = datos.proyectos.map((p) => `- ${p.nombreProyecto}: ${formatearMoneda(p.tarifaHora)} por hora`).join("\n");
    detallePagoFilas =
      datos.proyectos.length > 0
        ? datos.proyectos
            .map((p) => `| ${datos.periodoPago ?? "-"} | ${p.nombreProyecto} | ${formatearMoneda(p.tarifaHora)} |`)
            .join("\n")
        : "| - | - | - |";
  } else {
    const partes: string[] = [];
    if (datos.nombreProyecto) partes.push(`Proyecto: ${datos.nombreProyecto}`);
    if (datos.periodoPago) partes.push(`Periodo: ${datos.periodoPago}`);
    partes.push(`${ETIQUETA_PAGO_LOCADOR[datos.tipoPagoLocadorCodigo ?? "MENSUAL"]}: ${formatearMoneda(datos.tarifa)}`);
    detallePago = partes.join("\n");
    detallePagoFilas = `| ${datos.periodoPago ?? "-"} | ${datos.nombreProyecto ?? "-"} | ${formatearMoneda(datos.tarifa)} |`;
  }

  const fechaFirmaDate = datos.fechaFirma;

  return {
    EMPLEADOR_RAZON_SOCIAL: EMPLEADOR.razonSocial,
    EMPLEADOR_RUC: EMPLEADOR.ruc,
    EMPLEADOR_DOMICILIO: EMPLEADOR.domicilio,
    EMPLEADOR_REPRESENTANTE: EMPLEADOR.representanteNombre,
    EMPLEADOR_REPRESENTANTE_DNI: EMPLEADOR.representanteDni,
    EMPLEADOR_TELEFONO: EMPLEADOR.telefono,
    EMPLEADOR_CORREO: EMPLEADOR.correo,
    EMPLEADOR_GIRO_NEGOCIO: EMPLEADOR.giroNegocio,
    NOMBRE_COMPLETO: `${datos.nombres} ${datos.apellidos}`,
    TIPO_DOCUMENTO: datos.tipoDocumentoDescripcion ?? "DNI",
    NRO_DOCUMENTO: datos.nroDocumento ?? "-",
    DIRECCION: datos.direccion ?? "-",
    PAIS: datos.paisDescripcion ?? "-",
    CIUDAD: datos.ciudadDescripcion ?? "-",
    CARGO: datos.cargo,
    CARGO_MAYUSCULAS: datos.cargo.toUpperCase(),
    FUNCIONES: datos.funciones ?? "las funciones inherentes a su cargo que se le asignen",
    FECHA_INICIO: formatearFechaLarga(datos.fechaInicio),
    FECHA_INICIO_CORTA: formatearFechaCorta(datos.fechaInicio),
    FECHA_FIN: datos.fechaFin ? formatearFechaLarga(datos.fechaFin) : "sin plazo fijo de termino",
    FECHA_FIN_CORTA: datos.fechaFin ? formatearFechaCorta(datos.fechaFin) : "-",
    FECHA_FIRMA: fechaFirmaDate ? formatearFechaLarga(fechaFirmaDate.toISOString().slice(0, 10)) : "(pendiente de firma)",
    FECHA_FIRMA_CORTA: fechaFirmaDate ? formatearFechaCortaDesdeDate(fechaFirmaDate) : "-",
    FECHA_FIRMA_DIA: fechaFirmaDate ? String(fechaFirmaDate.getDate()) : "-",
    FECHA_FIRMA_MES: fechaFirmaDate ? MESES[fechaFirmaDate.getMonth()] : "-",
    FECHA_FIRMA_ANIO: fechaFirmaDate ? String(fechaFirmaDate.getFullYear()) : "-",
    NRO_CONTRATO: datos.nroContrato,
    DETALLE_REMUNERACION: detalleRemuneracion || "-",
    TOTAL_REMUNERACION: formatearMoneda(totalConceptos),
    TOTAL_REMUNERACION_LETRAS: montoEnLetras(totalConceptos),
    DIAS_LABORALES: datos.diasLaborales ?? "-",
    HORA_INICIO: formatearHora12(datos.horaInicio),
    HORA_FIN: formatearHora12(datos.horaFin),
    NOTA_JORNADA: datos.notaJornada ?? "",
    DETALLE_PAGO: detallePago || "-",
    DETALLE_PAGO_FILAS: detallePagoFilas,
    NRO_CUENTA: datos.nroCuenta ?? "-",
    CCI: datos.cci ?? "-",
    BANCO: datos.banco ?? "-",
  };
}

export function reemplazarTokens(texto: string, tokens: TokensContrato): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (coincidencia, clave: string) => {
    const valor = tokens[clave as keyof TokensContrato];
    return valor !== undefined ? valor : coincidencia;
  });
}
