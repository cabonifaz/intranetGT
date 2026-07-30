import {
  obtenerContratoPorToken,
  listarConceptosContrato,
  listarProyectosContrato,
} from "@/lib/db/repositories/contrato.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { tieneIdentidadCompletaContrato } from "@/lib/rrhh/identidad";
import FirmarContratoForm from "@/components/rrhh/FirmarContratoForm";

function formatearMoneda(monto: number): string {
  return `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "sin fecha de termino definida";
  return new Date(fecha).toLocaleDateString("es-PE", { dateStyle: "long" });
}

function estaVencido(tokenExpira: string | null | undefined): boolean {
  if (!tokenExpira) return false;
  return new Date(tokenExpira).getTime() < Date.now();
}

export default async function FirmarContratoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contrato = await obtenerContratoPorToken(token);

  const invalido = !contrato || contrato.ESTADO_CONTRATO_CODIGO !== "PENDIENTE_FIRMA";
  const vencido = estaVencido(contrato?.TOKEN_EXPIRA);

  if (invalido || vencido) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Link no disponible</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {vencido
            ? "Este link de firma ha expirado. Pide a Recursos Humanos que te genere uno nuevo."
            : "Este link ya fue usado o no es válido. Si crees que es un error, contacta a Recursos Humanos."}
        </p>
      </div>
    );
  }

  const identidadCompleta = tieneIdentidadCompletaContrato(contrato);
  const esLocador = contrato.TIPO_CONTRATO_CODIGO === "LOCADOR";
  const esPorHora = esLocador && contrato.TIPO_PAGO_LOCADOR_CODIGO === "POR_HORA";

  const [conceptos, proyectos, bancos] = await Promise.all([
    !esLocador ? listarConceptosContrato(contrato.ID_CONTRATO) : Promise.resolve([]),
    esPorHora ? listarProyectosContrato(contrato.ID_CONTRATO) : Promise.resolve([]),
    listarMaestros("BANCO"),
  ]);
  const totalConceptos = conceptos.reduce((suma, c) => suma + Number(c.MONTO), 0);

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
          Hola, {contrato.NOMBRES} {contrato.APELLIDOS}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Revisa los datos de tu {esLocador ? "acuerdo de prestación de servicios" : "contrato"} y completa lo que falta para firmarlo.
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Cargo</dt>
            <dd className="text-slate-800 dark:text-slate-200">{contrato.CARGO}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Inicio</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatearFecha(contrato.FECHA_INICIO)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Fin</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatearFecha(contrato.FECHA_FIN)}</dd>
          </div>
          {esPorHora ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Tarifa por proyecto</dt>
              <dd className="text-slate-800 dark:text-slate-200">
                {proyectos.length === 0
                  ? "-"
                  : proyectos.map((p) => `${p.NOMBRE_PROYECTO}: ${formatearMoneda(Number(p.TARIFA_HORA))}/hora`).join(", ")}
              </dd>
            </div>
          ) : esLocador ? (
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Tarifa</dt>
              <dd className="text-slate-800 dark:text-slate-200">{formatearMoneda(Number(contrato.TARIFA ?? 0))}</dd>
            </div>
          ) : (
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Sueldo mensual</dt>
              <dd className="text-slate-800 dark:text-slate-200">{formatearMoneda(totalConceptos)}</dd>
            </div>
          )}
        </dl>

        <a
          href={`/api/contratos/publico/${token}/vista-previa`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
        >
          Leer el contrato completo (PDF)
        </a>
      </div>

      {identidadCompleta ? (
        <FirmarContratoForm
          token={token}
          bancos={bancos.map((b) => ({ value: b.DESCRIPCION, label: b.DESCRIPCION }))}
          nroCuentaInicial={contrato.NRO_CUENTA}
          cciInicial={contrato.CCI}
          bancoInicial={contrato.BANCO}
        />
      ) : (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Aún no puedes firmar</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            A tus datos les falta el documento de identidad (tipo y número). Pide a Recursos Humanos que complete esa
            información en el Directorio Corporativo antes de firmar.
          </p>
        </div>
      )}
    </div>
  );
}
