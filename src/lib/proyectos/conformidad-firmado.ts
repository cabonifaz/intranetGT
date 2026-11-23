import {
  obtenerConformidad,
  listarItemsConformidad,
  listarFirmantesConformidad,
  recalcularEstadoConformidad,
} from "@/lib/db/repositories/proyecto-conformidad.repository";
import { generarConformidadPdf } from "@/lib/proyectos/generar-conformidad-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { guardarArchivo, leerArchivo } from "@/lib/storage/local-storage";

// Despues de CUALQUIER cambio en los firmantes de una conformidad (una
// firma nueva -- digital o manual --, o la eliminacion de un firmante
// pendiente), hay que: 1) si ya hay al menos 1 firma real, regenerar el
// PDF combinado mostrando el estado actual de TODOS los firmantes (los
// que firmaron digitalmente con su trazo incrustado, los que firmaron
// con upload manual con la linea en blanco -- su evidencia queda aparte
// en DOCUMENTO_FIRMADO_INDIVIDUAL_PATH, no se intenta incrustar un PDF/
// foto como si fuera una firma --, los pendientes en blanco); 2)
// recalcular si con esto la conformidad ya quedo completa (ver
// SP_PROYECTO_CONFORMIDAD_RECALCULAR_ESTADO). Es la unica fuente de
// verdad de ese flujo, la usan tanto la subida manual del gestor como
// el endpoint publico de firma.
export async function regenerarDocumentoFirmadoConformidad(idConformidad: number): Promise<void> {
  const conformidad = await obtenerConformidad(idConformidad);
  if (!conformidad) return;

  const [items, firmantes, logo] = await Promise.all([
    listarItemsConformidad(idConformidad),
    listarFirmantesConformidad(idConformidad),
    cargarLogoEmpresa(),
  ]);

  const hayAlMenosUnaFirma = firmantes.some((f) => f.FECHA_FIRMA !== null);
  let documentoFirmadoPath: string | null = null;

  if (hayAlMenosUnaFirma) {
    const firmantesPdf = await Promise.all(
      firmantes.map(async (f) => ({
        nombre: f.NOMBRE,
        cargo: f.CARGO,
        firmaPngBytes: f.FIRMA_PNG_PATH ? new Uint8Array(await leerArchivo(f.FIRMA_PNG_PATH)) : null,
      })),
    );

    const pdfBytes = await generarConformidadPdf({
      idConformidad: conformidad.ID_CONFORMIDAD,
      titulo: conformidad.TITULO,
      nombreProyecto: conformidad.PROYECTO_NOMBRE,
      clienteRazonSocial: conformidad.CLIENTE_RAZON_SOCIAL,
      clienteRuc: conformidad.CLIENTE_RUC,
      hitoNombre: conformidad.HITO_NOMBRE,
      hitoMonto: Number(conformidad.HITO_MONTO),
      monedaCodigo: conformidad.MONEDA_CODIGO,
      fechaEmision: conformidad.FECHA_EMISION,
      items: items.map((i) => ({ descripcion: i.DESCRIPCION })),
      logoBytes: logo.logoBytes,
      logoFormato: logo.logoFormato,
      firmantes: firmantesPdf,
    });

    documentoFirmadoPath = `proyectos/conformidades/${idConformidad}/conformidad-firmada.pdf`;
    await guardarArchivo(documentoFirmadoPath, pdfBytes);
  }

  await recalcularEstadoConformidad(idConformidad, documentoFirmadoPath);
}
