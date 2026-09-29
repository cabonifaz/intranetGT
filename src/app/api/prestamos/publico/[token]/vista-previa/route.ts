import { NextResponse } from "next/server";
import { obtenerPrestamoPorToken, listarCuotasPrestamo } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { generarCompromisoPrestamoPdf } from "@/lib/rrhh/planilla/generar-compromiso-prestamo-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";

// Version sin firma del compromiso, para que el beneficiario lo pueda leer
// completo antes de firmarlo (link publico con token, ver
// /prestamos/firmar/[token]). Misma vigencia que el endpoint de firma.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const prestamo = await obtenerPrestamoPorToken(token);
  if (!prestamo) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (prestamo.ESTADO_PRESTAMO_CODIGO !== "PENDIENTE_FIRMA") {
    return NextResponse.json({ error: "Este compromiso ya no está disponible." }, { status: 409 });
  }
  if (!prestamo.TOKEN_EXPIRA || new Date(prestamo.TOKEN_EXPIRA).getTime() < Date.now()) {
    return NextResponse.json({ error: "El link ha expirado. Pide a RRHH que genere uno nuevo." }, { status: 410 });
  }

  const [cuotas, logo] = await Promise.all([listarCuotasPrestamo(prestamo.ID_PRESTAMO), cargarLogoEmpresa()]);

  const pdfBytes = await generarCompromisoPrestamoPdf({
    prestamo,
    cuotas,
    logoBytes: logo.logoBytes,
    logoFormato: logo.logoFormato,
    firmaColaboradorPngBytes: null,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="prestamo-vista-previa.pdf"',
    },
  });
}
