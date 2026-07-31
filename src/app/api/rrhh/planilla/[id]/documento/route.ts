import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerDetalle } from "@/lib/db/repositories/rrhh-planilla.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");

  const { id } = await params;
  const detalle = await obtenerDetalle(Number(id));

  if (!detalle?.DOCUMENTO_PATH) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const archivo = await leerArchivo(detalle.DOCUMENTO_PATH);
  const prefijo = detalle.TIPO_CONTRATO_CODIGO === "LOCADOR" ? "rxh" : "boleta";

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${prefijo}-${detalle.ID_PLANILLA_DETALLE}.pdf"`,
    },
  });
}
