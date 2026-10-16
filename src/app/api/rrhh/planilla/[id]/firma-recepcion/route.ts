import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerDetalle } from "@/lib/db/repositories/rrhh-planilla.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

// Firma de aceptacion que el colaborador dejo al confirmar la recepcion
// de su boleta (en el intranet o por el link publico) -- mismo patron
// que rxh-firmado/route.ts.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");

  const { id } = await params;
  const detalle = await obtenerDetalle(Number(id));

  if (!detalle?.FIRMA_PNG_PATH) {
    return NextResponse.json({ error: "Firma no disponible." }, { status: 404 });
  }

  const archivo = await leerArchivo(detalle.FIRMA_PNG_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="firma-recepcion-${detalle.ID_PLANILLA_DETALLE}.png"`,
    },
  });
}
