import { NextResponse } from "next/server";
import { obtenerFirmanteConformidadPorToken, registrarFirmaFirmanteConformidad } from "@/lib/db/repositories/proyecto-conformidad.repository";
import { regenerarDocumentoFirmadoConformidad } from "@/lib/proyectos/conformidad-firmado";
import { guardarArchivo, leerArchivo } from "@/lib/storage/local-storage";
import { tieneFormaDeToken } from "@/lib/validar-token";

function decodificarFirmaPng(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

// Firma de UN firmante puntual de la conformidad, sin sesion (link
// publico con token, ver /conformidades/firmar/[token] -- cada firmante
// tiene su propio token). Sin idUsuario de sesion -- registrarFirmaFirmanteConformidad
// acepta null ahi, igual que el flujo manual del gestor
// (subirFirmanteFirmadoAction) pero identificando que fue una autofirma
// por venir sin usuario. El PDF combinado (con el estado de TODOS los
// firmantes, no solo este) se regenera en regenerarDocumentoFirmadoConformidad,
// que tambien decide si con esta firma la conformidad ya quedo completa.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const firmante = tieneFormaDeToken(token) ? await obtenerFirmanteConformidadPorToken(token) : null;
  if (!firmante) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (firmante.ESTADO_CONFORMIDAD_CODIGO !== "EMITIDA" || firmante.FECHA_FIRMA !== null) {
    return NextResponse.json({ error: "Esta conformidad ya no está disponible para firmar." }, { status: 409 });
  }
  if (!firmante.TOKEN_EXPIRA || new Date(firmante.TOKEN_EXPIRA).getTime() < Date.now()) {
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
  const firmaPngPath = `proyectos/conformidades/${firmante.ID_CONFORMIDAD}/firmante-${firmante.ID_FIRMANTE}-firma.png`;
  await guardarArchivo(firmaPngPath, firmaPngBytes);

  await registrarFirmaFirmanteConformidad(firmante.ID_FIRMANTE, firmaPngPath, null, null);
  await regenerarDocumentoFirmadoConformidad(firmante.ID_CONFORMIDAD);

  const documentoPath = `proyectos/conformidades/${firmante.ID_CONFORMIDAD}/conformidad-firmada.pdf`;
  const pdfBytes = await leerArchivo(documentoPath);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="conformidad-${firmante.ID_CONFORMIDAD}.pdf"`,
    },
  });
}
