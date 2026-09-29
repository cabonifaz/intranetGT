import { NextResponse } from "next/server";
import {
  obtenerPrestamoPorToken,
  listarCuotasPrestamo,
  registrarFirmaPrestamo,
} from "@/lib/db/repositories/rrhh-prestamo.repository";
import { generarCompromisoPrestamoPdf } from "@/lib/rrhh/planilla/generar-compromiso-prestamo-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { guardarArchivo } from "@/lib/storage/local-storage";

function decodificarFirmaPng(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

// Firma del compromiso por el beneficiario, sin sesion (link publico con
// token, ver /prestamos/firmar/[token]). No hay idUsuario de sesion --
// registrarFirmaPrestamo acepta null ahi, igual que en el flujo manual de
// RRHH pero identificando que fue una autofirma por venir sin usuario.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const prestamo = await obtenerPrestamoPorToken(token);
  if (!prestamo) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (prestamo.ESTADO_PRESTAMO_CODIGO !== "PENDIENTE_FIRMA") {
    return NextResponse.json({ error: "Este compromiso ya no está disponible para firmar." }, { status: 409 });
  }
  if (!prestamo.TOKEN_EXPIRA || new Date(prestamo.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link de firma ha expirado. Pide a RRHH que genere uno nuevo." }, { status: 410 });
  }

  let body: { firmaPngDataUrl?: string; confirmoLectura?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  if (body.confirmoLectura !== true) {
    return NextResponse.json({ error: "Debes confirmar que leíste el compromiso antes de firmar." }, { status: 400 });
  }
  if (!body.firmaPngDataUrl) {
    return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
  }

  const firmaPngBytes = decodificarFirmaPng(body.firmaPngDataUrl);

  const [cuotas, logo] = await Promise.all([listarCuotasPrestamo(prestamo.ID_PRESTAMO), cargarLogoEmpresa()]);

  const pdfBytes = await generarCompromisoPrestamoPdf({
    prestamo,
    cuotas,
    logoBytes: logo.logoBytes,
    logoFormato: logo.logoFormato,
    firmaColaboradorPngBytes: firmaPngBytes,
  });

  const firmaPngPath = `rrhh/prestamos/${prestamo.ID_PRESTAMO}/firma-colaborador.png`;
  const documentoPath = `rrhh/prestamos/${prestamo.ID_PRESTAMO}/compromiso-firmado.pdf`;

  await guardarArchivo(firmaPngPath, firmaPngBytes);
  await guardarArchivo(documentoPath, pdfBytes);

  await registrarFirmaPrestamo(prestamo.ID_PRESTAMO, documentoPath, firmaPngPath, null);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="compromiso-prestamo-${prestamo.ID_PRESTAMO}.pdf"`,
    },
  });
}
