import { NextResponse } from "next/server";
import { requireImportarContrato } from "@/lib/auth/require-permiso";
import { generarSolicitudContratoPdf } from "@/lib/rrhh/contratos/generar-solicitud-contrato-pdf";

// Formato en blanco (no depende de ningun contrato puntual) -- se genera
// al vuelo, no se persiste.
export async function GET() {
  await requireImportarContrato();

  const bytes = await generarSolicitudContratoPdf();

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="solicitud-registro-contrato.pdf"`,
    },
  });
}
