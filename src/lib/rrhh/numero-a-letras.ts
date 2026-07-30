// Conversion de montos a letras para contratos (formato legal peruano
// habitual: "Seiscientos y 00/100 Soles"). Implementacion propia, sin
// dependencia externa -- solo cubre lo que un sueldo/tarifa real necesita
// (hasta cientos de millones).

const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const ESPECIALES_10_19 = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];
const VEINTES = [
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function decenasATexto(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIALES_10_19[n - 10];
  if (n < 30) return VEINTES[n - 20];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
}

function centenasATexto(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const base = c > 0 ? CENTENAS[c] : "";
  const restoTexto = resto > 0 ? decenasATexto(resto) : "";
  return [base, restoTexto].filter(Boolean).join(" ");
}

export function numeroATextoEntero(n: number): string {
  if (n === 0) return "cero";

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? "un millón" : `${centenasATexto(millones)} millones`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "mil" : `${centenasATexto(miles)} mil`);
  }
  if (resto > 0) {
    partes.push(centenasATexto(resto));
  }
  return partes.join(" ");
}

// "Seiscientos y 00/100 Soles" -- formato habitual en contratos/documentos
// legales peruanos: parte entera en letras (con mayuscula inicial), la
// parte decimal siempre en digitos sobre 100.
export function montoEnLetras(monto: number, moneda = "Soles"): string {
  const redondeado = Math.round(Math.max(monto, 0) * 100) / 100;
  const parteEntera = Math.trunc(redondeado);
  const centavos = Math.round((redondeado - parteEntera) * 100);
  const centavosTexto = String(centavos).padStart(2, "0");

  const enteroTexto = numeroATextoEntero(parteEntera);
  const capitalizado = enteroTexto.charAt(0).toUpperCase() + enteroTexto.slice(1);

  return `${capitalizado} y ${centavosTexto}/100 ${moneda}`;
}
