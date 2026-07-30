import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerContrato } from "@/lib/db/repositories/contrato.repository";
import { leerArchivo } from "@/lib/storage/local-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("RRHH_CONTRATOS", "LECTURA");

  const { id } = await params;
  const contrato = await obtenerContrato(Number(id));

  if (!contrato?.DOCUMENTO_PATH) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const archivo = await leerArchivo(contrato.DOCUMENTO_PATH);

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrato-${contrato.ID_CONTRATO}.pdf"`,
    },
  });
}
