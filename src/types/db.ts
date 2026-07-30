import type { RowDataPacket } from "mysql2/promise";

export interface UsuarioLoginRow extends RowDataPacket {
  ID_USUARIO: number;
  USUARIO: string;
  CLAVE_HASH: string;
  NOMBRES: string;
  APELLIDOS: string;
  REQUIERE_CAMBIO_CLAVE: number;
  INTENTOS_FALLIDOS: number;
  FECHA_BLOQUEO: string | null;
  ID_ESTADO_USUARIO: number;
  ESTADO_USUARIO_CODIGO: "ACTIVO" | "BLOQUEADO" | "INACTIVO";
}

export interface UsuarioPerfilRow extends RowDataPacket {
  ID_USUARIO: number;
  USUARIO: string;
  CORREO: string;
  NOMBRES: string;
  APELLIDOS: string;
  ULTIMO_LOGIN: string | null;
  ID_ROL: number | null;
  ROL_CODIGO: string | null;
  ROL_NOMBRE: string | null;
  NIVEL_JERARQUICO: number | null;
  ID_AREA: number | null;
  AREA_CODIGO: string | null;
  AREA_NOMBRE: string | null;
}

export interface SesionRow extends RowDataPacket {
  ID_SESION: string;
  ID_USUARIO: number;
  FECHA_EXPIRACION: string;
  FECHA_ULTIMA_ACTIVIDAD: string;
  ESTADO_SESION_CODIGO: "ACTIVA" | "CERRADA" | "EXPIRADA" | "CERRADA_FORZADA";
  USUARIO: string;
  NOMBRES: string;
  APELLIDOS: string;
  ID_ESTADO_USUARIO: number;
  ESTADO_USUARIO_CODIGO: "ACTIVO" | "BLOQUEADO" | "INACTIVO";
}

export interface SesionActivaRow extends RowDataPacket {
  ID_SESION: string;
  IP_ORIGEN: string | null;
  USER_AGENT: string | null;
  FECHA_INICIO: string;
  FECHA_ULTIMA_ACTIVIDAD: string;
  FECHA_EXPIRACION: string;
}

export interface HorarioEfectivoRow extends RowDataPacket {
  HORA_INICIO: string | null;
  HORA_FIN: string | null;
}

export interface AreaRow extends RowDataPacket {
  ID_AREA: number;
  CODIGO: string;
  NOMBRE: string;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
  ORDEN: number;
}

export interface RolRow extends RowDataPacket {
  ID_ROL: number;
  ID_AREA: number;
  AREA_NOMBRE: string;
  CODIGO: string;
  NOMBRE: string;
  NIVEL_JERARQUICO: number;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface RolPorAreaRow extends RowDataPacket {
  ID_ROL: number;
  CODIGO: string;
  NOMBRE: string;
  NIVEL_JERARQUICO: number;
}

export interface AplicacionRow extends RowDataPacket {
  ID_APLICACION: number;
  CODIGO: string;
  NOMBRE: string;
  DESCRIPCION: string | null;
  ICONO: string | null;
  TIPO_APLICACION_CODIGO: "MODULO_INTERNO" | "APP_EXTERNA";
  RUTA_INTERNA: string | null;
  URL_EXTERNA: string | null;
  REQUIERE_SSO: number;
  ID_AREA: number;
  AREA_NOMBRE: string;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
  ORDEN: number;
}

export interface AplicacionVisibleRow extends RowDataPacket {
  ID_APLICACION: number;
  CODIGO: string;
  NOMBRE: string;
  DESCRIPCION: string | null;
  ICONO: string | null;
  TIPO_APLICACION_CODIGO: "MODULO_INTERNO" | "APP_EXTERNA";
  RUTA_INTERNA: string | null;
  URL_EXTERNA: string | null;
  REQUIERE_SSO: number;
  ID_AREA: number;
  AREA_NOMBRE: string;
  AREA_ORDEN: number;
  NIVEL_PERMISO_CODIGO: "LECTURA" | "ESCRITURA" | "ADMIN";
  NIVEL_PERMISO_ORDEN: number;
}

export interface RolAplicacionPermisoRow extends RowDataPacket {
  ID_APLICACION: number;
  APLICACION_CODIGO: string;
  APLICACION_NOMBRE: string;
  ID_NIVEL_PERMISO: number;
  NIVEL_PERMISO_CODIGO: "SIN_ACCESO" | "LECTURA" | "ESCRITURA" | "ADMIN";
}

export interface PermisoUsuarioRow extends RowDataPacket {
  APLICACION_CODIGO: string;
  NIVEL_PERMISO_ORDEN: number;
}

export interface EmpleadoDirectorioRow extends RowDataPacket {
  ID_USUARIO: number;
  NOMBRES: string;
  APELLIDOS: string;
  CORREO: string;
  ID_AREA: number | null;
  AREA_NOMBRE: string | null;
  ROL_NOMBRE: string | null;
  TELEFONO: string | null;
  EXTENSION: string | null;
  FOTO_URL: string | null;
  ID_TIPO_DOCUMENTO: number | null;
  NRO_DOCUMENTO: string | null;
  DIRECCION: string | null;
  ID_PAIS: number | null;
  ID_CIUDAD: number | null;
}

export type SistemaPensionCodigo = "AFP" | "ONP";
export type AfpFondoCodigo = "INTEGRA" | "PRIMA" | "PROFUTURO" | "HABITAT";

export interface EmpleadoDetalleRow extends RowDataPacket {
  ID_USUARIO: number;
  USUARIO: string;
  NOMBRES: string;
  APELLIDOS: string;
  CORREO: string;
  ID_AREA: number | null;
  AREA_NOMBRE: string | null;
  ROL_NOMBRE: string | null;
  PUESTO: string | null;
  TELEFONO: string | null;
  EXTENSION: string | null;
  FECHA_INGRESO: string | null;
  FOTO_URL: string | null;
  ID_TIPO_DOCUMENTO: number | null;
  TIPO_DOCUMENTO_CODIGO: string | null;
  TIPO_DOCUMENTO_DESCRIPCION: string | null;
  NRO_DOCUMENTO: string | null;
  DIRECCION: string | null;
  ID_PAIS: number | null;
  PAIS_DESCRIPCION: string | null;
  ID_CIUDAD: number | null;
  CIUDAD_DESCRIPCION: string | null;
  CORREO_CLOCKIFY: string | null;
  ID_SISTEMA_PENSION: number | null;
  SISTEMA_PENSION_CODIGO: SistemaPensionCodigo | null;
  SISTEMA_PENSION_DESCRIPCION: string | null;
  ID_AFP_FONDO: number | null;
  AFP_FONDO_CODIGO: AfpFondoCodigo | null;
  AFP_FONDO_DESCRIPCION: string | null;
  SUSPENSION_RETENCION_4TA_HASTA: string | null;
}

export interface UsuarioListadoRow extends RowDataPacket {
  ID_USUARIO: number;
  USUARIO: string;
  CORREO: string;
  NOMBRES: string;
  APELLIDOS: string;
  ID_ESTADO_USUARIO: number;
  ESTADO_USUARIO_CODIGO: string;
  ULTIMO_LOGIN: string | null;
}

export interface UsuarioRolActivoRow extends RowDataPacket {
  ID_USUARIO: number;
  ID_ROL: number;
  ROL_NOMBRE: string;
  ROL_CODIGO: string;
  ES_PRINCIPAL: number;
}

export interface NotificacionRow extends RowDataPacket {
  ID_NOTIFICACION_USUARIO: number;
  ID_NOTIFICACION: number;
  TITULO: string;
  MENSAJE: string;
  URL_DESTINO: string | null;
  FECHA_CREACION: string;
  LEIDA: number;
  FECHA_LECTURA: string | null;
  CATEGORIA_CODIGO: string;
  CATEGORIA_DESCRIPCION: string;
}

export type TipoContratoCodigo = "PLANILLA_FULLTIME" | "PLANILLA_PARTTIME" | "LOCADOR";
export type TipoPagoLocadorCodigo = "POR_HORA" | "POR_PROYECTO" | "MENSUAL" | "POR_JORNADA";
export type EstadoContratoCodigo = "BORRADOR" | "PENDIENTE_FIRMA" | "FIRMADO" | "VENCIDO" | "RENOVADO" | "ANULADO";

export interface ContratoListadoRow extends RowDataPacket {
  ID_CONTRATO: number;
  ID_USUARIO: number;
  NOMBRES: string;
  APELLIDOS: string;
  TIPO_CONTRATO_CODIGO: TipoContratoCodigo;
  TIPO_CONTRATO_DESCRIPCION: string;
  CARGO: string;
  FECHA_INICIO: string;
  FECHA_FIN: string | null;
  ESTADO_CONTRATO_CODIGO: EstadoContratoCodigo;
  ESTADO_CONTRATO_DESCRIPCION: string;
}

export interface ContratoDetalleRow extends RowDataPacket {
  ID_CONTRATO: number;
  ID_USUARIO: number;
  ID_TIPO_CONTRATO: number;
  ID_TIPO_PAGO_LOCADOR: number | null;
  CARGO: string;
  FUNCIONES: string | null;
  FECHA_INICIO: string;
  FECHA_FIN: string | null;
  DIAS_LABORALES: string | null;
  HORA_INICIO: string | null;
  HORA_FIN: string | null;
  NOTA_JORNADA: string | null;
  TARIFA: string | null;
  ID_MONEDA: number | null;
  MONEDA_CODIGO: string | null;
  TIPO_CAMBIO: string | null;
  ID_PROYECTO: number | null;
  NOMBRE_PROYECTO: string | null;
  PERIODO_PAGO: string | null;
  NRO_CUENTA: string | null;
  CCI: string | null;
  BANCO: string | null;
  ID_ESTADO_CONTRATO: number;
  ID_CONTRATO_ANTERIOR: number | null;
  TOKEN_FIRMA: string | null;
  TOKEN_EXPIRA: string | null;
  FIRMA_PNG_PATH: string | null;
  FECHA_FIRMA: string | null;
  DOCUMENTO_PATH: string | null;
  FECHA_CREACION: string;
  NOMBRES: string;
  APELLIDOS: string;
  CORREO: string;
  NRO_DOCUMENTO: string | null;
  DIRECCION: string | null;
  TIPO_DOCUMENTO_CODIGO: string | null;
  TIPO_DOCUMENTO_DESCRIPCION: string | null;
  PAIS_DESCRIPCION: string | null;
  CIUDAD_DESCRIPCION: string | null;
  TIPO_CONTRATO_CODIGO: TipoContratoCodigo;
  TIPO_CONTRATO_DESCRIPCION: string;
  TIPO_PAGO_LOCADOR_CODIGO: TipoPagoLocadorCodigo | null;
  TIPO_PAGO_LOCADOR_DESCRIPCION: string | null;
  ESTADO_CONTRATO_CODIGO: EstadoContratoCodigo;
  ESTADO_CONTRATO_DESCRIPCION?: string;
}

export interface ContratoConceptoRow extends RowDataPacket {
  ID_CONTRATO_CONCEPTO: number;
  ID_CONCEPTO: number;
  CONCEPTO_CODIGO: string;
  CONCEPTO_DESCRIPCION: string;
  MONTO: string;
}

export interface ContratoProyectoRow extends RowDataPacket {
  ID_CONTRATO_PROYECTO: number;
  TARIFA_HORA: string;
  ID_PROYECTO: number | null;
  ID_MONEDA: number;
  MONEDA_CODIGO: string;
  TIPO_CAMBIO: string | null;
  NOMBRE_PROYECTO: string | null;
}

export interface ContratoHorasRow extends RowDataPacket {
  ID_CONTRATO_HORAS: number;
  ID_CONTRATO_PROYECTO: number;
  ID_PROYECTO: number | null;
  NOMBRE_PROYECTO: string | null;
  ID_MONEDA: number;
  MONEDA_CODIGO: string;
  TIPO_CAMBIO: string | null;
  PERIODO: string;
  HORAS: string;
  MONTO_CALCULADO: string;
  FECHA_CREACION: string;
  FECHA_PAGO: string | null;
  ID_MOVIMIENTO: number | null;
  FINANCIADO_CON_PASIVO: number;
}

// Cross-contrato (SP_RRHH_CONTRATO_HORAS_LISTAR_TODOS) -- para el
// selector de "periodo ya cargado" al agregar mano de obra manual en
// Proyectos, mismo uso que ContratoPeriodoPagoRow pero para locadores
// POR_HORA (que no usan RRHH_CONTRATO_PERIODO_PAGO).
export interface ContratoHorasTodosRow extends RowDataPacket {
  ID_CONTRATO_HORAS: number;
  ID_CONTRATO: number;
  NOMBRE_PROYECTO: string | null;
  ID_MONEDA: number;
  MONEDA_CODIGO: string;
  TIPO_CAMBIO: string | null;
  PERIODO: string;
  HORAS: string;
  MONTO_CALCULADO: string;
  FECHA_CREACION: string;
  ID_MOVIMIENTO: number | null;
  FINANCIADO_CON_PASIVO: number;
}

export interface ContratoPeriodoPagoRow extends RowDataPacket {
  ID_PERIODO_PAGO: number;
  ID_CONTRATO: number;
  PERIODO: string;
  MONTO: string;
  FECHA_PAGO: string | null;
  ID_MOVIMIENTO: number | null;
  FECHA_CREACION: string;
  FINANCIADO_CON_PASIVO: number;
}

export interface PeriodoPagoPendienteRow extends RowDataPacket {
  ID_PERIODO_PAGO: number;
  ID_CONTRATO: number;
  PERIODO: string;
  MONTO: string;
  FECHA_CREACION: string;
  NOMBRES: string;
  APELLIDOS: string;
  CARGO: string;
}

export interface HorasPendienteRow extends RowDataPacket {
  ID_CONTRATO_HORAS: number;
  ID_CONTRATO_PROYECTO: number;
  ID_PROYECTO: number | null;
  ID_CONTRATO: number;
  NOMBRE_PROYECTO: string | null;
  ID_MONEDA: number;
  MONEDA_CODIGO: string;
  TIPO_CAMBIO: string | null;
  PERIODO: string;
  MONTO_CALCULADO: string;
  FECHA_CREACION: string;
  NOMBRES: string;
  APELLIDOS: string;
}

export interface PlantillaContratoListadoRow extends RowDataPacket {
  ID_PLANTILLA: number;
  NOMBRE: string;
  TITULO_DOCUMENTO: string;
  ID_TIPO_CONTRATO: number;
  TIPO_CONTRATO_CODIGO: TipoContratoCodigo;
  TIPO_CONTRATO_DESCRIPCION: string;
  ID_TIPO_PAGO_LOCADOR: number | null;
  TIPO_PAGO_LOCADOR_CODIGO: TipoPagoLocadorCodigo | null;
  TIPO_PAGO_LOCADOR_DESCRIPCION: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface PlantillaContratoDetalleRow extends RowDataPacket {
  ID_PLANTILLA: number;
  NOMBRE: string;
  TITULO_DOCUMENTO: string;
  PARRAFO_INTRO: string;
  ID_TIPO_CONTRATO: number;
  TIPO_CONTRATO_CODIGO: TipoContratoCodigo;
  TIPO_CONTRATO_DESCRIPCION: string;
  ID_TIPO_PAGO_LOCADOR: number | null;
  TIPO_PAGO_LOCADOR_CODIGO: TipoPagoLocadorCodigo | null;
  TIPO_PAGO_LOCADOR_DESCRIPCION: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface PlantillaContratoActivaRow extends RowDataPacket {
  ID_PLANTILLA: number;
  NOMBRE: string;
  TITULO_DOCUMENTO: string;
  PARRAFO_INTRO: string;
}

export interface PlantillaClausulaRow extends RowDataPacket {
  ID_CLAUSULA: number;
  ID_PLANTILLA: number;
  ORDEN: number;
  TITULO: string | null;
  CONTENIDO: string;
}

export interface ConfiguracionEmpresaRow extends RowDataPacket {
  ID_CONFIGURACION: number;
  LOGO_URL: string | null;
  LOGO_FORMATO: string | null;
}

export type TipoCuentaCodigo = "BANCARIA" | "DETRACCIONES" | "IGV_FAVOR" | "RENTA_FAVOR";
export type MonedaCodigo = "PEN" | "USD";
export type TipoMovimientoCuentaCodigo = "INGRESO" | "EGRESO";

export interface CuentaListadoRow extends RowDataPacket {
  ID_CUENTA: number;
  NOMBRE: string;
  NRO_CUENTA: string | null;
  SALDO_ACTUAL: string;
  ID_TIPO_CUENTA: number;
  TIPO_CUENTA_CODIGO: TipoCuentaCodigo;
  TIPO_CUENTA_DESCRIPCION: string;
  ID_BANCO: number | null;
  BANCO_DESCRIPCION: string | null;
  ID_MONEDA: number | null;
  MONEDA_CODIGO: MonedaCodigo | null;
  MONEDA_DESCRIPCION: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface CuentaDetalleRow extends RowDataPacket {
  ID_CUENTA: number;
  NOMBRE: string;
  NRO_CUENTA: string | null;
  CCI: string | null;
  SALDO_INICIAL: string;
  SALDO_ACTUAL: string;
  ID_TIPO_CUENTA: number;
  TIPO_CUENTA_CODIGO: TipoCuentaCodigo;
  TIPO_CUENTA_DESCRIPCION: string;
  ID_BANCO: number | null;
  BANCO_DESCRIPCION: string | null;
  ID_MONEDA: number | null;
  MONEDA_CODIGO: MonedaCodigo | null;
  MONEDA_DESCRIPCION: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface MovimientoCuentaRow extends RowDataPacket {
  ID_MOVIMIENTO: number;
  ID_CUENTA: number;
  FECHA_MOVIMIENTO: string;
  MONTO: string;
  CONCEPTO: string;
  TIPO_REFERENCIA: string | null;
  ID_REFERENCIA: number | null;
  SALDO_RESULTANTE: string;
  FECHA_CREACION: string;
  TIPO_MOVIMIENTO_CODIGO: TipoMovimientoCuentaCodigo;
  TIPO_MOVIMIENTO_DESCRIPCION: string;
}

export type TipoPasivoCodigo = "PRESTAMO" | "LINEA_CREDITO" | "DEUDA_PROVEEDOR" | "OTRO";
export type EstadoPasivoCodigo = "ACTIVO" | "CANCELADO" | "ANULADO";
export type EstadoCuotaCodigo = "PENDIENTE" | "PAGADA" | "PROTESTADA" | "ANULADA";

export interface PasivoListadoRow extends RowDataPacket {
  ID_PASIVO: number;
  ACREEDOR: string;
  DESCRIPCION: string | null;
  MONTO_TOTAL: string;
  FECHA_ORIGEN: string;
  ID_TIPO_PASIVO: number;
  TIPO_PASIVO_CODIGO: TipoPasivoCodigo;
  TIPO_PASIVO_DESCRIPCION: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  MONEDA_DESCRIPCION: string;
  ID_ESTADO_PASIVO: number;
  ESTADO_PASIVO_CODIGO: EstadoPasivoCodigo;
  ESTADO_PASIVO_DESCRIPCION: string;
  MOTIVO_ANULACION: string | null;
  FECHA_ANULACION: string | null;
  ANULADO_POR: string | null;
  TIPO_REFERENCIA: string | null;
  ID_REFERENCIA: number | null;
  FINANCIA_DESCRIPCION: string | null;
  MONTO_PENDIENTE: string;
}

export interface PasivoDetalleRow extends RowDataPacket {
  ID_PASIVO: number;
  ID_PROVEEDOR: number | null;
  ID_CONTACTO: number | null;
  ID_USUARIO: number | null;
  ACREEDOR: string;
  DESCRIPCION: string | null;
  NRO_OPERACION: string | null;
  MONTO_TOTAL: string;
  TASA_INTERES: string | null;
  FECHA_ORIGEN: string;
  ID_TIPO_PASIVO: number;
  TIPO_PASIVO_CODIGO: TipoPasivoCodigo;
  TIPO_PASIVO_DESCRIPCION: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  MONEDA_DESCRIPCION: string;
  TIPO_CAMBIO: string | null;
  ID_CUENTA_PAGO: number | null;
  CUENTA_PAGO_NOMBRE: string | null;
  TIPO_REFERENCIA: string | null;
  ID_REFERENCIA: number | null;
  FINANCIA_DESCRIPCION: string | null;
  ID_PROYECTO: number | null;
  PROYECTO_NOMBRE: string | null;
  ID_ESTADO_PASIVO: number;
  ESTADO_PASIVO_CODIGO: EstadoPasivoCodigo;
  ESTADO_PASIVO_DESCRIPCION: string;
  MOTIVO_ANULACION: string | null;
  FECHA_ANULACION: string | null;
  ANULADO_POR: string | null;
}

export interface PasivoCuotaRow extends RowDataPacket {
  ID_CUOTA: number;
  ID_PASIVO: number;
  NRO_CUOTA: number;
  FECHA_VENCIMIENTO: string;
  MONTO: string;
  FECHA_PAGO: string | null;
  ID_MOVIMIENTO: number | null;
  MOTIVO_PROTESTO: string | null;
  FECHA_PROTESTO: string | null;
  ID_CUENTA_PAGO: number | null;
  CUENTA_PAGO_NOMBRE: string | null;
  ID_ESTADO_CUOTA: number;
  ESTADO_CUOTA_CODIGO: EstadoCuotaCodigo;
  ESTADO_CUOTA_DESCRIPCION: string;
}

export interface CuotaPendienteRow extends RowDataPacket {
  ID_CUOTA: number;
  ID_PASIVO: number;
  NRO_CUOTA: number;
  FECHA_VENCIMIENTO: string;
  MONTO: string;
  ACREEDOR: string;
  TIPO_PASIVO_DESCRIPCION: string;
  ID_ESTADO_CUOTA: number;
  ESTADO_CUOTA_CODIGO: EstadoCuotaCodigo;
  ESTADO_CUOTA_DESCRIPCION: string;
  ID_CUENTA_PAGO: number | null;
  CUENTA_PAGO_NOMBRE: string | null;
  CUENTA_SALDO_ACTUAL: string | null;
  CUENTA_MONEDA_CODIGO: MonedaCodigo | null;
}

// Cronograma de pagos recurrentes (SP_PAGO_RECURRENTE_LISTAR/OBTENER --
// mismo shape para ambos, ver sp_pago_recurrente.sql). ID_PROYECTO/
// PROYECTO_NOMBRE null = administrativo/general o transversal (sin
// reparto automatico entre proyectos, ver 035_pagos_recurrentes.sql).
export interface PagoRecurrenteRow extends RowDataPacket {
  ID_PAGO_RECURRENTE: number;
  NOMBRE: string;
  DESCRIPCION: string | null;
  ES_VARIABLE: number;
  MONTO_FIJO: string | null;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  TIPO_CAMBIO: string | null;
  INTERVALO_MESES: number;
  DIA_VENCIMIENTO: number;
  FECHA_INICIO: string;
  FECHA_FIN: string | null;
  ID_PROYECTO: number | null;
  PROYECTO_NOMBRE: string | null;
  ID_CUENTA_PAGO_DEFAULT: number | null;
  CUENTA_PAGO_DEFAULT_NOMBRE: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface PagoRecurrenteInstanciaRow extends RowDataPacket {
  ID_INSTANCIA: number;
  ID_PAGO_RECURRENTE: number;
  PERIODO: string;
  FECHA_VENCIMIENTO: string;
  MONTO: string;
  ID_CUENTA_PAGO: number | null;
  CUENTA_PAGO_NOMBRE: string | null;
  FECHA_PAGO: string | null;
  ID_MOVIMIENTO: number | null;
  FECHA_CREACION: string;
  FINANCIADO_CON_PASIVO: number;
}

// Cross-pago-recurrente (SP_PAGO_RECURRENTE_INSTANCIA_LISTAR_PENDIENTES) --
// para Cuentas por Pagar y las alertas de vencimiento.
export interface InstanciaPendienteRow extends RowDataPacket {
  ID_INSTANCIA: number;
  ID_PAGO_RECURRENTE: number;
  PAGO_RECURRENTE_NOMBRE: string;
  ID_PROYECTO: number | null;
  PROYECTO_NOMBRE: string | null;
  PERIODO: string;
  FECHA_VENCIMIENTO: string;
  MONTO: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
}

// Cache de "ya se generaron las instancias pendientes de hoy" -- ver
// SP_PAGO_RECURRENTE_GENERACION_DIA_OBTENER, mismo patron que TipoCambioSunatDiaRow.
export interface PagoRecurrenteGeneracionDiaRow extends RowDataPacket {
  FECHA: string;
}

export type EstadoCompraCodigo = "PENDIENTE_PAGO" | "PARCIAL" | "PAGADA" | "ANULADA";

export interface ProveedorListadoRow extends RowDataPacket {
  ID_PROVEEDOR: number;
  RUC: string | null;
  RAZON_SOCIAL: string;
  ES_PERSONA_NATURAL: number;
  NOMBRE_CONTACTO: string | null;
  TELEFONO: string | null;
  CORREO: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface ProveedorDetalleRow extends RowDataPacket {
  ID_PROVEEDOR: number;
  RUC: string | null;
  RAZON_SOCIAL: string;
  ES_PERSONA_NATURAL: number;
  NOMBRE_CONTACTO: string | null;
  TELEFONO: string | null;
  CORREO: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface CompraListadoRow extends RowDataPacket {
  ID_COMPRA: number;
  DESCRIPCION: string;
  NRO_DOCUMENTO: string | null;
  FECHA_COMPRA: string;
  FECHA_VENCIMIENTO: string | null;
  MONTO_TOTAL: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  TIPO_CAMBIO: string | null;
  ID_PROVEEDOR: number;
  PROVEEDOR_RAZON_SOCIAL: string;
  ID_PROYECTO: number | null;
  ID_ESTADO_COMPRA: number;
  ESTADO_COMPRA_CODIGO: EstadoCompraCodigo;
  ESTADO_COMPRA_DESCRIPCION: string;
  MONTO_PAGADO: string;
  MONTO_FINANCIADO: string;
}

export interface CompraPendienteRow extends RowDataPacket {
  ID_COMPRA: number;
  DESCRIPCION: string;
  FECHA_VENCIMIENTO: string | null;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  PROVEEDOR_RAZON_SOCIAL: string;
  MONTO_PENDIENTE: string;
}

export interface CompraDetalleRow extends RowDataPacket {
  ID_COMPRA: number;
  DESCRIPCION: string;
  NRO_DOCUMENTO: string | null;
  FECHA_COMPRA: string;
  FECHA_VENCIMIENTO: string | null;
  MONTO_TOTAL: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  MONEDA_DESCRIPCION: string;
  TIPO_CAMBIO: string | null;
  ID_PROVEEDOR: number;
  PROVEEDOR_RAZON_SOCIAL: string;
  PROVEEDOR_RUC: string | null;
  ID_PROYECTO: number | null;
  PROYECTO_NOMBRE: string | null;
  ID_ESTADO_COMPRA: number;
  ESTADO_COMPRA_CODIGO: EstadoCompraCodigo;
  ESTADO_COMPRA_DESCRIPCION: string;
  MONTO_PAGADO: string;
  MONTO_FINANCIADO: string;
}

export interface CompraPagoRow extends RowDataPacket {
  ID_PAGO: number;
  ID_COMPRA: number;
  FECHA_PAGO: string;
  MONTO: string;
  ID_CUENTA: number;
  CUENTA_NOMBRE: string;
  ID_MOVIMIENTO: number;
  FECHA_CREACION: string;
}

export type TipoProyectoCodigo = "PROYECTO" | "SERVICIO";
export type EstadoProyectoCodigo = "EN_CURSO" | "CERRADO" | "ANULADO";

interface ProyectoCosteoBase {
  COSTO_COMPRAS: string;
  COSTO_MANO_OBRA_HORAS: string;
  COSTO_MANO_OBRA_MANUAL: string;
  COSTO_MANO_OBRA_TARIFA_UNICA: string;
  COSTO_PAGOS_RECURRENTES: string;
  INGRESO_REAL: string;
  MONTO_PLAN_PENDIENTE: string;
  PASIVO_GENERADO: string;
}

export interface ProyectoListadoRow extends RowDataPacket, ProyectoCosteoBase {
  ID_PROYECTO: number;
  NOMBRE: string;
  ID_CLIENTE: number | null;
  ES_INTERNO: number;
  CLIENTE_RAZON_SOCIAL: string | null;
  FECHA_INICIO: string;
  FECHA_FIN_ESTIMADA: string | null;
  COSTO_PRESUPUESTADO: string;
  INGRESO_ESPERADO: string;
  ID_TIPO_PROYECTO: number;
  TIPO_PROYECTO_CODIGO: TipoProyectoCodigo;
  TIPO_PROYECTO_DESCRIPCION: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  MONEDA_DESCRIPCION: string;
  ID_ESTADO_PROYECTO: number;
  ESTADO_PROYECTO_CODIGO: EstadoProyectoCodigo;
  ESTADO_PROYECTO_DESCRIPCION: string;
}

export interface ProyectoDetalleRow extends RowDataPacket, ProyectoCosteoBase {
  ID_PROYECTO: number;
  NOMBRE: string;
  ID_CLIENTE: number | null;
  ES_INTERNO: number;
  CLIENTE_RAZON_SOCIAL: string | null;
  DESCRIPCION: string | null;
  FECHA_INICIO: string;
  FECHA_FIN_ESTIMADA: string | null;
  COSTO_PRESUPUESTADO: string;
  INGRESO_ESPERADO: string;
  ID_TIPO_PROYECTO: number;
  TIPO_PROYECTO_CODIGO: TipoProyectoCodigo;
  TIPO_PROYECTO_DESCRIPCION: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  MONEDA_DESCRIPCION: string;
  ID_ESTADO_PROYECTO: number;
  ESTADO_PROYECTO_CODIGO: EstadoProyectoCodigo;
  ESTADO_PROYECTO_DESCRIPCION: string;
  COSTO_COMPRAS_PAGADO: string;
  COSTO_MANO_OBRA_MANUAL_PAGADO: string;
  COSTO_MANO_OBRA_HORAS_PAGADO: string;
  COSTO_MANO_OBRA_TARIFA_UNICA_PAGADO: string;
  COSTO_PAGOS_RECURRENTES_PAGADO: string;
}

export interface ProyectoIngresoRow extends RowDataPacket {
  ID_INGRESO: number;
  ID_PROYECTO: number;
  FECHA: string;
  MONTO: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  TIPO_CAMBIO: string | null;
  CONCEPTO: string;
  FECHA_CREACION: string;
}

export interface TipoCambioCategoriaRow extends RowDataPacket {
  ID_CATEGORIA_TC: number;
  CODIGO: string;
  DESCRIPCION: string;
  VALOR: string | null;
  VIGENTE_DESDE: string | null;
}

export interface TipoCambioHistoricoRow extends RowDataPacket {
  ID_TIPO_CAMBIO: number;
  ID_CATEGORIA_TC: number;
  VALOR: string;
  FECHA_CREACION: string;
  USUARIO_NOMBRES: string | null;
  USUARIO_APELLIDOS: string | null;
}

export interface TipoCambioSunatDiaRow extends RowDataPacket {
  FECHA: string;
  TC_COMPRA: string;
  TC_VENTA: string;
}

export interface ProyectoCostoManoObraRow extends RowDataPacket {
  ID_ASIGNACION: number;
  ID_PROYECTO: number;
  ID_CONTRATO: number | null;
  ID_PROVEEDOR: number | null;
  PERIODO: string;
  MONTO: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  TIPO_CAMBIO: string | null;
  CONCEPTO: string | null;
  FECHA_CREACION: string;
  FECHA_PAGO: string | null;
  ID_MOVIMIENTO: number | null;
  CONTRATO_NOMBRES: string | null;
  CONTRATO_APELLIDOS: string | null;
  PROVEEDOR_RAZON_SOCIAL: string | null;
  FINANCIADO_CON_PASIVO: number;
}

// Desglose por persona del costo de mano de obra por horas de un
// proyecto (SP_PROYECTO_MANO_OBRA_HORAS_LISTAR) -- de solo lectura, el
// pago/financiamiento se gestiona desde /rrhh/contratos/[ID_CONTRATO].
export interface ProyectoManoObraHorasRow extends RowDataPacket {
  ID_CONTRATO_HORAS: number;
  ID_CONTRATO_PROYECTO: number;
  ID_CONTRATO: number;
  NOMBRES: string;
  APELLIDOS: string;
  PERIODO: string;
  HORAS: string;
  MONTO_CALCULADO: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  TIPO_CAMBIO: string | null;
  FECHA_CREACION: string;
  FECHA_PAGO: string | null;
  ID_MOVIMIENTO: number | null;
  FINANCIADO_CON_PASIVO: number;
}

export interface ManoObraPendienteRow extends RowDataPacket {
  ID_ASIGNACION: number;
  ID_PROYECTO: number;
  PROYECTO_NOMBRE: string;
  PERIODO: string;
  MONTO: string;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
  FECHA_CREACION: string;
  PERSONA: string;
}

export type TipoHitoFacturacionCodigo = "ADELANTO" | "HITO" | "FACTURA_FINAL" | "VARIABLE";
export type EstadoHitoFacturacionCodigo = "PLANEADO" | "FACTURADO" | "COBRADO" | "ANULADO";

export interface ProyectoHitoRow extends RowDataPacket {
  ID_HITO: number;
  ID_PROYECTO: number;
  NOMBRE: string;
  PORCENTAJE: string | null;
  MONTO: string;
  FECHA_ESTIMADA: string | null;
  ORDEN: number;
  NRO_FACTURA: string | null;
  FECHA_FACTURADO: string | null;
  ID_INGRESO: number | null;
  ID_TIPO_HITO: number;
  TIPO_HITO_CODIGO: TipoHitoFacturacionCodigo;
  TIPO_HITO_DESCRIPCION: string;
  ID_ESTADO_HITO: number;
  ESTADO_HITO_CODIGO: EstadoHitoFacturacionCodigo;
  ESTADO_HITO_DESCRIPCION: string;
}

export interface ProyectoHitoPendienteRow extends ProyectoHitoRow {
  PROYECTO_NOMBRE: string;
}

// Cross-proyecto (SP_PROYECTO_HITO_LISTAR_IGV_PENDIENTE) -- para la
// seccion "IGV pendiente de declarar" de la cuenta IGV_FAVOR, ver
// src/lib/proyectos/impuestos.ts.
export interface ProyectoHitoIgvPendienteRow extends RowDataPacket {
  ID_HITO: number;
  ID_PROYECTO: number;
  PROYECTO_NOMBRE: string;
  MONTO: string;
  MONEDA_CODIGO: MonedaCodigo;
  ESTADO_HITO_CODIGO: EstadoHitoFacturacionCodigo;
  FECHA_FACTURADO: string | null;
}

export interface ClienteListadoRow extends RowDataPacket {
  ID_CLIENTE: number;
  RUC: string | null;
  RAZON_SOCIAL: string;
  NOMBRE_CONTACTO: string | null;
  TELEFONO: string | null;
  CORREO: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export interface ClienteDetalleRow extends RowDataPacket {
  ID_CLIENTE: number;
  RUC: string | null;
  RAZON_SOCIAL: string;
  NOMBRE_CONTACTO: string | null;
  TELEFONO: string | null;
  CORREO: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export type TipoMovimientoProyectoCodigo = "INGRESO" | "GASTO_COMPRA" | "GASTO_MANO_OBRA" | "GASTO_MANO_OBRA_HORAS";

export interface ProyectoMovimientoRow extends RowDataPacket {
  TIPO: TipoMovimientoProyectoCodigo;
  FECHA: string;
  MONTO: string;
  CONCEPTO: string;
}

export type TipoRelacionContactoCodigo = "CLIENTE" | "PROVEEDOR" | "SOCIO_COMERCIAL" | "OTRO";

// Fila basica de un contacto -- usada por los listados acotados a un
// Cliente o Proveedor puntual (ya se sabe de que empresa es, no hace
// falta EMPRESA_NOMBRE/TIPO_RELACION).
export interface DirectorioContactoRow extends RowDataPacket {
  ID_CONTACTO: number;
  NOMBRES: string;
  APELLIDOS: string;
  AREA: string | null;
  CARGO: string | null;
  TEMA_INTERES: string | null;
  RELACION_GT: string | null;
  TELEFONO: string | null;
  CORREO: string | null;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

// Fila completa -- usada por la pestaña "Contactos externos" del
// Directorio y por el detalle de un contacto, donde el tipo/empresa no
// se conocen de antemano.
export interface DirectorioContactoConTipoRow extends DirectorioContactoRow {
  ID_TIPO_RELACION: number;
  TIPO_RELACION_CODIGO: TipoRelacionContactoCodigo;
  TIPO_RELACION_DESCRIPCION: string;
  EMPRESA_NOMBRE: string;
}

export interface DirectorioContactoDetalleRow extends DirectorioContactoConTipoRow {
  ID_CLIENTE: number | null;
  ID_PROVEEDOR: number | null;
}

// =====================================================================
// Planilla Mensual (RRHH)
// =====================================================================

export type EstadoPlanillaMensualCodigo = "BORRADOR" | "EMITIDA";
export type EstadoEmisionPlanillaDetalleCodigo = "PENDIENTE" | "EMITIDA";

export interface PlanillaParametroRow extends RowDataPacket {
  ID_PARAMETRO: number;
  ANIO: number;
  FECHA_VIGENCIA_DESDE: string;
  UIT: string;
  PORCENTAJE_ONP: string;
  PORCENTAJE_ESSALUD: string;
  APORTE_OBLIGATORIO_AFP_PORCENTAJE: string;
  PRIMA_SEGURO_AFP_PORCENTAJE: string;
  TOPE_ASEGURABLE_AFP: string;
  PORCENTAJE_RENTA_4TA: string;
  UMBRAL_RENTA_4TA: string;
  UIT_DEDUCCION_RENTA_5TA: string;
  FECHA_CREACION?: string;
}

export interface PlanillaParametroTramoRow extends RowDataPacket {
  ID_TRAMO: number;
  ID_PARAMETRO: number;
  DESDE_UIT: string;
  HASTA_UIT: string | null;
  TASA: string;
  ORDEN: number;
}

export interface PlanillaParametroAfpFondoRow extends RowDataPacket {
  ID_PARAMETRO_AFP_FONDO: number;
  ID_PARAMETRO: number;
  ID_AFP_FONDO: number;
  AFP_FONDO_CODIGO: AfpFondoCodigo;
  AFP_FONDO_DESCRIPCION: string;
  COMISION_PORCENTAJE: string;
}

export interface PlanillaMensualRow extends RowDataPacket {
  ID_PLANILLA_MENSUAL: number;
  ANIO: number;
  MES: number;
  PERIODO: string;
  ID_ESTADO_PLANILLA: number;
  ESTADO_PLANILLA_CODIGO: EstadoPlanillaMensualCodigo;
  ESTADO_PLANILLA_DESCRIPCION: string;
  FECHA_EMISION: string | null;
  TOTAL_COLABORADORES?: number;
  TOTAL_EMITIDOS?: number;
}

export interface PlanillaDetalleListadoRow extends RowDataPacket {
  ID_PLANILLA_DETALLE: number;
  ID_PLANILLA_MENSUAL: number;
  ID_CONTRATO: number;
  ID_USUARIO: number;
  NOMBRES: string;
  APELLIDOS: string;
  CARGO: string;
  ID_TIPO_CONTRATO: number;
  TIPO_CONTRATO_CODIGO: string;
  TIPO_CONTRATO_DESCRIPCION: string;
  ID_TIPO_PAGO_LOCADOR: number | null;
  TIPO_PAGO_LOCADOR_CODIGO: string | null;
  TIPO_PAGO_LOCADOR_DESCRIPCION: string | null;
  MONTO_BRUTO: string;
  MONTO_APORTE_PENSION: string | null;
  MONTO_RETENCION_RENTA: string | null;
  MONTO_ESSALUD: string | null;
  MONTO_NETO: string;
  CALCULO_AUTOMATICO: number;
  AFP_ESSALUD_PAGADO: number;
  ID_ESTADO_EMISION: number;
  ESTADO_EMISION_CODIGO: EstadoEmisionPlanillaDetalleCodigo;
  ESTADO_EMISION_DESCRIPCION: string;
  DOCUMENTO_PATH: string | null;
  FECHA_EMISION: string | null;
}

export interface PlanillaDetalleRow extends RowDataPacket {
  ID_PLANILLA_DETALLE: number;
  ID_PLANILLA_MENSUAL: number;
  PERIODO: string;
  ANIO: number;
  MES: number;
  ID_CONTRATO: number;
  ID_USUARIO: number;
  NOMBRES: string;
  APELLIDOS: string;
  CORREO: string;
  CARGO: string;
  ID_TIPO_CONTRATO: number;
  TIPO_CONTRATO_CODIGO: string;
  TIPO_CONTRATO_DESCRIPCION: string;
  ID_TIPO_PAGO_LOCADOR: number | null;
  TIPO_PAGO_LOCADOR_CODIGO: string | null;
  TIPO_PAGO_LOCADOR_DESCRIPCION: string | null;
  NRO_CUENTA: string | null;
  CCI: string | null;
  BANCO: string | null;
  ID_TIPO_DOCUMENTO: number | null;
  TIPO_DOCUMENTO_DESCRIPCION: string | null;
  NRO_DOCUMENTO: string | null;
  DIRECCION: string | null;
  ID_SISTEMA_PENSION: number | null;
  SISTEMA_PENSION_CODIGO: SistemaPensionCodigo | null;
  SISTEMA_PENSION_DESCRIPCION: string | null;
  ID_AFP_FONDO: number | null;
  AFP_FONDO_CODIGO: AfpFondoCodigo | null;
  AFP_FONDO_DESCRIPCION: string | null;
  SUSPENSION_RETENCION_4TA_HASTA: string | null;
  TIPO_REFERENCIA: string | null;
  ID_REFERENCIA: number | null;
  MONTO_BRUTO: string;
  MONTO_APORTE_PENSION: string | null;
  MONTO_RETENCION_RENTA: string | null;
  MONTO_ESSALUD: string | null;
  MONTO_NETO: string;
  CALCULO_AUTOMATICO: number;
  AFP_ESSALUD_PAGADO: number;
  FECHA_MARCADO_PAGADO: string | null;
  ID_ESTADO_EMISION: number;
  ESTADO_EMISION_CODIGO: EstadoEmisionPlanillaDetalleCodigo;
  ESTADO_EMISION_DESCRIPCION: string;
  DOCUMENTO_PATH: string | null;
  FECHA_EMISION: string | null;
}

export interface PlanillaDetalleHorasRow extends RowDataPacket {
  ID_CONTRATO_HORAS: number;
  PERIODO: string;
  HORAS: string;
  MONTO_CALCULADO: string;
  PROYECTO_NOMBRE: string;
  TARIFA_HORA: string;
}

export interface PlanillaContratoElegibleRow extends RowDataPacket {
  ID_CONTRATO: number;
  ID_USUARIO: number;
  NOMBRES: string;
  APELLIDOS: string;
  CARGO: string;
  FECHA_INICIO: string;
  FECHA_FIN: string | null;
  TARIFA: string | null;
  ID_TIPO_CONTRATO: number;
  TIPO_CONTRATO_CODIGO: string;
  ID_TIPO_PAGO_LOCADOR: number | null;
  TIPO_PAGO_LOCADOR_CODIGO: string | null;
  ID_SISTEMA_PENSION: number | null;
  SISTEMA_PENSION_CODIGO: SistemaPensionCodigo | null;
  ID_AFP_FONDO: number | null;
  AFP_FONDO_CODIGO: AfpFondoCodigo | null;
  SUSPENSION_RETENCION_4TA_HASTA: string | null;
}

export interface PlanillaContratoHorasDelPeriodoRow extends RowDataPacket {
  ID_CONTRATO_HORAS: number;
  HORAS: string;
  MONTO_CALCULADO: string;
  ID_CONTRATO_PROYECTO: number;
  ID_MONEDA: number;
  MONEDA_CODIGO: MonedaCodigo;
}

export interface PlanillaAcumuladoAnioRow extends RowDataPacket {
  BRUTO_ACUMULADO: string;
  RETENCION_ACUMULADA: string;
}
