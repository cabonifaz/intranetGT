export interface SesionUsuario {
  idSesion: string;
  idUsuario: number;
  usuario: string;
  nombres: string;
  apellidos: string;
  dentroHorario: boolean;
  fechaExpiracion: string;
}

export interface PerfilUsuario {
  idUsuario: number;
  usuario: string;
  correo: string;
  nombres: string;
  apellidos: string;
  ultimoLogin: string | null;
  rol: {
    idRol: number;
    codigo: string;
    nombre: string;
    nivelJerarquico: number;
  } | null;
  area: {
    idArea: number;
    codigo: string;
    nombre: string;
  } | null;
}
