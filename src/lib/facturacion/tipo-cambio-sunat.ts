import {
  obtenerTipoCambioSunatDia,
  guardarTipoCambioSunatDia,
  actualizarTipoCambioSunatDia,
  listarCategoriasTipoCambio,
  fijarTipoCambio,
} from "@/lib/db/repositories/tipo-cambio.repository";

// TC oficial SUNAT del dia -- fuente publica gratuita, sin API key.
// "fecha" viene en formato "YYYY-MM-DD" directo desde la API.
const URL_SUNAT = "https://api.apis.net.pe/v1/tipo-cambio-sunat";

interface RespuestaTipoCambioSunat {
  origen: string;
  compra: number;
  venta: number;
  moneda: string;
  fecha: string;
}

export interface TipoCambioSunatDelDia {
  fecha: string;
  compra: number;
  venta: number;
}

// Devuelve null ante cualquier falla (red, formato inesperado, etc.) --
// esto es solo un dato de apoyo, nunca debe romper la pantalla que lo
// muestra.
export async function consultarTipoCambioSunat(): Promise<TipoCambioSunatDelDia | null> {
  try {
    const respuesta = await fetch(URL_SUNAT, { cache: "no-store" });
    if (!respuesta.ok) return null;

    const datos = (await respuesta.json()) as Partial<RespuestaTipoCambioSunat>;
    if (!datos.fecha || typeof datos.compra !== "number" || typeof datos.venta !== "number") return null;

    return { fecha: datos.fecha, compra: datos.compra, venta: datos.venta };
  } catch {
    return null;
  }
}

// Fija las 4 categorias (laboral/prestamos/compras/ventas) con el TC
// VENTA de SUNAT -- decision explicita del usuario: las 4 se sincronizan
// al mismo valor en vez de ser independientes. idUsuarioCreacion=null
// para el sync automatico (no se le atribuye a quien haya cargado la
// pagina), o el usuario real cuando lo dispara el boton "Actualizar TC
// ahora" -- la pantalla de Tipo de Cambio distingue las filas con
// USUARIO_CREACION=null como "Automatico (SUNAT)" en el historico. Cada
// categoria se puede seguir corrigiendo a mano despues -- esa correccion,
// al ser una fila mas nueva en el historico, queda como la vigente hasta
// el proximo sync o la siguiente correccion.
async function fijarTodasLasCategoriasConVenta(venta: number, idUsuarioCreacion: number | null): Promise<void> {
  const categorias = await listarCategoriasTipoCambio();
  await Promise.all(categorias.map((cat) => fijarTipoCambio(cat.ID_CATEGORIA_TC, venta, idUsuarioCreacion)));
}

// Se llama en cada request a una pantalla de Facturacion (ver
// facturacion/layout.tsx) -- no hay cron real en esta app, asi que "una
// vez al dia" se logra dejando que el primer visitante del dia lo
// dispare. No-op inmediato si TIPO_CAMBIO_SUNAT_DIA ya tiene la fecha de
// hoy (FECHA es su PK), asi que en la practica solo hace trabajo real
// una vez por dia sin importar cuantas paginas se visiten.
export async function asegurarTipoCambioDelDia(): Promise<void> {
  const hoy = new Date().toISOString().slice(0, 10);
  const existente = await obtenerTipoCambioSunatDia(hoy);
  if (existente) return;

  const resultado = await consultarTipoCambioSunat();
  if (!resultado) return;

  await guardarTipoCambioSunatDia(resultado.fecha, resultado.compra, resultado.venta);
  await fijarTodasLasCategoriasConVenta(resultado.venta, null);
}

// Version a demanda del boton "Actualizar TC ahora" -- a diferencia de
// asegurarTipoCambioDelDia, SI vuelve a llamar la API aunque el sync
// automatico del dia ya haya corrido (sobreescribe TIPO_CAMBIO_SUNAT_DIA
// de hoy con SP_TIPO_CAMBIO_SUNAT_ACTUALIZAR_DIA) y siempre agrega una
// fila nueva al historico de las 4 categorias, atribuida a quien
// presiono el boton. Devuelve false si la API fallo (nada que actualizar).
export async function actualizarTipoCambioSunatAhora(idUsuarioCreacion: number): Promise<boolean> {
  const resultado = await consultarTipoCambioSunat();
  if (!resultado) return false;

  await actualizarTipoCambioSunatDia(resultado.fecha, resultado.compra, resultado.venta);
  await fijarTodasLasCategoriasConVenta(resultado.venta, idUsuarioCreacion);
  return true;
}
