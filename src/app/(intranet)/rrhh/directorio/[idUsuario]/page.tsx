import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { obtenerEmpleado } from "@/lib/db/repositories/rrhh-empleado.repository";
import { obtenerPerfilUsuario } from "@/lib/db/repositories/usuario.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarContratos } from "@/lib/db/repositories/contrato.repository";
import { calcularVisibilidadFicha } from "@/lib/rrhh/visibilidad-directorio";
import { actualizarEmpleadoAction } from "@/lib/actions/rrhh";
import { SelectorPaisCiudad } from "@/components/rrhh/SelectorPaisCiudad";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function FichaEmpleadoPage({
  params,
}: {
  params: Promise<{ idUsuario: string }>;
}) {
  const sesion = await requirePermiso("RRHH_DIRECTORIO", "LECTURA");
  const { idUsuario } = await params;
  const idUsuarioObjetivo = Number(idUsuario);

  const [empleado, permisos, perfilVisor] = await Promise.all([
    obtenerEmpleado(idUsuarioObjetivo),
    obtenerPermisosUsuario(sesion.idUsuario),
    obtenerPerfilUsuario(sesion.idUsuario),
  ]);

  if (!empleado) notFound();

  const [tiposDocumento, paises, sistemasPension, afpFondos] = await Promise.all([
    listarMaestros("TIPO_DOCUMENTO_IDENTIDAD"),
    listarMaestros("PAIS"),
    listarMaestros("SISTEMA_PENSION"),
    listarMaestros("AFP_FONDO"),
  ]);

  const { puedeVerCompleto, puedeEditarCompleto, puedeEditarBasico } = calcularVisibilidadFicha({
    esUnoMismo: sesion.idUsuario === idUsuarioObjetivo,
    tieneEscrituraRrhh: tienePermiso(permisos, "RRHH_DIRECTORIO", "ESCRITURA"),
    viewerNivelJerarquico: perfilVisor?.NIVEL_JERARQUICO ?? null,
    viewerIdArea: perfilVisor?.ID_AREA ?? null,
    targetIdArea: empleado.ID_AREA,
  });

  const puedeGestionarContratos = tienePermiso(permisos, "RRHH_CONTRATOS", "ESCRITURA");
  const contratosDePersona = puedeGestionarContratos
    ? (await listarContratos()).filter((c) => c.ID_USUARIO === idUsuarioObjetivo)
    : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        {empleado.NOMBRES} {empleado.APELLIDOS}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {empleado.AREA_NOMBRE ?? "Sin area"} {empleado.ROL_NOMBRE ? `- ${empleado.ROL_NOMBRE}` : ""}
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Correo" valor={empleado.CORREO} />
          <Dato etiqueta="Puesto" valor={empleado.PUESTO ?? "No registrado"} />
          {puedeVerCompleto ? (
            <>
              <Dato etiqueta="Usuario" valor={empleado.USUARIO} />
              <Dato
                etiqueta={empleado.TIPO_DOCUMENTO_DESCRIPCION ?? "Documento"}
                valor={empleado.NRO_DOCUMENTO ?? "No registrado"}
              />
              <Dato etiqueta="Pais" valor={empleado.PAIS_DESCRIPCION ?? "No registrado"} />
              <Dato etiqueta="Ciudad" valor={empleado.CIUDAD_DESCRIPCION ?? "No registrada"} />
              <Dato etiqueta="Direccion" valor={empleado.DIRECCION ?? "No registrada"} />
              <Dato etiqueta="Telefono" valor={empleado.TELEFONO ?? "No registrado"} />
              <Dato etiqueta="Extension" valor={empleado.EXTENSION ?? "No registrada"} />
              <Dato etiqueta="Fecha de ingreso" valor={empleado.FECHA_INGRESO ?? "No registrada"} />
              <Dato
                etiqueta="Sistema de pension"
                valor={
                  empleado.SISTEMA_PENSION_DESCRIPCION
                    ? `${empleado.SISTEMA_PENSION_DESCRIPCION}${empleado.AFP_FONDO_DESCRIPCION ? ` (${empleado.AFP_FONDO_DESCRIPCION})` : ""}`
                    : "No configurado"
                }
              />
              <Dato
                etiqueta="Suspension retencion 4ta"
                valor={empleado.SUSPENSION_RETENCION_4TA_HASTA ? `Vigente hasta ${formatearFecha(empleado.SUSPENSION_RETENCION_4TA_HASTA)}` : "No tiene"}
              />
            </>
          ) : null}
        </dl>
        {!puedeVerCompleto ? (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Solo se muestra informacion basica de contacto. RRHH y la jefatura de su area pueden ver el detalle
            completo.
          </p>
        ) : null}
      </section>

      {puedeGestionarContratos ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Contratos</h2>
            <Link
              href={`/rrhh/contratos/nuevo?usuario=${idUsuarioObjetivo}`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Crear contrato
            </Link>
          </div>

          {contratosDePersona.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {contratosDePersona.map((c) => {
                const puedeRenovar = c.ESTADO_CONTRATO_CODIGO === "FIRMADO" || c.ESTADO_CONTRATO_CODIGO === "VENCIDO";
                return (
                  <li key={c.ID_CONTRATO} className="flex items-center justify-between py-2">
                    <div>
                      <Link href={`/rrhh/contratos/${c.ID_CONTRATO}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                        {c.TIPO_CONTRATO_DESCRIPCION}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatearFecha(c.FECHA_INICIO)} — {formatearFecha(c.FECHA_FIN)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {c.ESTADO_CONTRATO_DESCRIPCION}
                      </span>
                      {puedeRenovar ? (
                        <Link
                          href={`/rrhh/contratos/${c.ID_CONTRATO}`}
                          className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                        >
                          Renovar
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Aun no tiene contratos.</p>
          )}
        </section>
      ) : null}

      {puedeEditarCompleto ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Editar ficha</h2>
          <form action={actualizarEmpleadoAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="idUsuario" value={empleado.ID_USUARIO} />
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                Tipo de documento
              </label>
              <ComboBusqueda
                name="idTipoDocumento"
                placeholder="Selecciona..."
                defaultValue={empleado.ID_TIPO_DOCUMENTO ? String(empleado.ID_TIPO_DOCUMENTO) : ""}
                opciones={tiposDocumento.map((t) => ({ value: String(t.ID_MAESTRO), label: t.DESCRIPCION }))}
              />
            </div>
            <Campo name="nroDocumento" label="Numero de documento" defaultValue={empleado.NRO_DOCUMENTO ?? ""} />
            <SelectorPaisCiudad
              paises={paises.map((p) => ({ value: String(p.ID_MAESTRO), label: p.DESCRIPCION }))}
              idPaisInicial={empleado.ID_PAIS ? String(empleado.ID_PAIS) : ""}
              idCiudadInicial={empleado.ID_CIUDAD ? String(empleado.ID_CIUDAD) : ""}
              ciudadLabelInicial={empleado.CIUDAD_DESCRIPCION ?? ""}
            />
            <Campo name="direccion" label="Direccion" defaultValue={empleado.DIRECCION ?? ""} />
            <Campo name="telefono" label="Telefono" defaultValue={empleado.TELEFONO ?? ""} />
            <Campo name="extension" label="Extension" defaultValue={empleado.EXTENSION ?? ""} />
            <Campo name="correoClockify" label="Correo de Clockify (opcional)" defaultValue={empleado.CORREO_CLOCKIFY ?? ""} />
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Sistema de pension (Planilla)</label>
              <ComboBusqueda
                name="idSistemaPension"
                placeholder="-- sin configurar --"
                defaultValue={empleado.ID_SISTEMA_PENSION ? String(empleado.ID_SISTEMA_PENSION) : ""}
                opciones={sistemasPension.map((s) => ({ value: String(s.ID_MAESTRO), label: s.DESCRIPCION }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Fondo AFP (solo si el sistema es AFP)</label>
              <ComboBusqueda
                name="idAfpFondo"
                placeholder="-- no aplica --"
                defaultValue={empleado.ID_AFP_FONDO ? String(empleado.ID_AFP_FONDO) : ""}
                opciones={afpFondos.map((f) => ({ value: String(f.ID_MAESTRO), label: f.DESCRIPCION }))}
              />
            </div>
            <Campo
              name="suspensionRetencion4taHasta"
              label="Suspension retencion Renta 4ta hasta (Locador, opcional)"
              type="date"
              defaultValue={empleado.SUSPENSION_RETENCION_4TA_HASTA ?? ""}
            />
            <div className="sm:col-span-2">
              <Campo name="fotoUrl" label="URL de foto (opcional)" defaultValue={empleado.FOTO_URL ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto sm:px-6" pendingText="Guardando...">
                Guardar
              </SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      {puedeEditarBasico ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Editar mis datos de contacto</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            El documento de identidad lo administra RRHH. El puesto se calcula solo del rol asignado y la fecha de
            ingreso, de tu primer contrato.
          </p>
          <form action={actualizarEmpleadoAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="idUsuario" value={empleado.ID_USUARIO} />
            <Campo name="telefono" label="Telefono" defaultValue={empleado.TELEFONO ?? ""} />
            <Campo name="direccion" label="Direccion" defaultValue={empleado.DIRECCION ?? ""} />
            <div className="sm:col-span-2">
              <Campo name="fotoUrl" label="URL de foto (opcional)" defaultValue={empleado.FOTO_URL ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto sm:px-6" pendingText="Guardando...">
                Guardar
              </SubmitButton>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{valor}</dd>
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
