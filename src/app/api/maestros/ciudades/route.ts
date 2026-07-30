import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-user";
import { listarMaestrosHijos } from "@/lib/db/repositories/maestro.repository";

export async function GET(request: NextRequest) {
  const sesion = await getCurrentSession();
  if (!sesion) {
    return NextResponse.json({ error: "No hay sesion activa." }, { status: 401 });
  }

  const idPais = Number(request.nextUrl.searchParams.get("idPais") ?? 0);
  if (!idPais) {
    return NextResponse.json({ error: "idPais es requerido." }, { status: 400 });
  }

  const ciudades = await listarMaestrosHijos("CIUDAD", idPais);
  return NextResponse.json({ ciudades });
}
