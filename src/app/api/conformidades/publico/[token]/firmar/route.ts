import { NextResponse } from "next/server";
import {
  obtenerConformidadPorToken,
  listarItemsConformidad,
  registrarFirmaConformidad,
} from "@/lib/db/repositories/proyecto-conformidad.repository";
import { generarConformidadPdf } from "@/lib/proyectos/generar-conformidad-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { guardarArchivo } from "@/lib/storage/local-storage";
import { tieneFormaDeToken } from "@/lib/validar-token";

function decodificarFirmaPng(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

// Firma de la conformidad por el cliente, sin sesion (link publico con
// token, ver /conformidades/firmar/[token]). Sin idUsuario de sesion --
// registrarFirmaConformidad acepta null ahi, igual que el flujo manual
// del gestor (subirConformidadFirmadaAction) pero identificando que fue
// una autofirma por venir sin usuario.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const conformidad = tieneFormaDeToken(token) ? await obtenerConformidadPorToken(token) : null;
  if (!conformidad) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (conformidad.ESTADO_CONFORMIDAD_CODIGO !== "EMITIDA") {
    return NextResponse.json({ error: "Esta conformidad ya no está disponible para firmar." }, { status: 409 });
  }
  if (!conformidad.TOKEN_EXPIRA || new Date(conformidad.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link de firma ha expirado. Pide a tu contacto que genere uno nuevo." }, { status: 410 });
  }

  let body: { firmaPngDataUrl?: string; confirmoLectura?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  if (body.confirmoLectura !== true) {
    return NextResponse.json({ error: "Debes confirmar que revisaste los items antes de firmar." }, { status: 400 });
  }
  if (!body.firmaPngDataUrl) {
    return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
  }

  const firmaPngBytes = decodificarFirmaPng(body.firmaPngDataUrl);

  const [items, logo] = await Promise.all([listarItemsConformidad(conformidad.ID_CONFORMIDAD), cargarLogoEmpresa()]);

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
    firmaClientePngBytes: firmaPngBytes,
  });

  const firmaPngPath = `proyectos/conformidades/${conformidad.ID_CONFORMIDAD}/firma-cliente.png`;
  const documentoPath = `proyectos/conformidades/${conformidad.ID_CONFORMIDAD}/conformidad-firmada.pdf`;

  await guardarArchivo(firmaPngPath, firmaPngBytes);
  await guardarArchivo(documentoPath, pdfBytes);

  await registrarFirmaConformidad(conformidad.ID_CONFORMIDAD, documentoPath, firmaPngPath, null);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="conformidad-${conformidad.ID_CONFORMIDAD}.pdf"`,
    },
  });
}
