// Crea el primer usuario SUPER_ADMIN. Requiere que db/schema, db/procedures
// y db/seed/001_catalogos_base.sql ya se hayan aplicado sobre la base de datos.
//
// Uso:
//   node --env-file=.env.local scripts/seed-admin.mjs
//
// Variables de entorno requeridas: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
// (mismas que usa la app) + ADMIN_USUARIO, ADMIN_CORREO, ADMIN_PASSWORD,
// ADMIN_NOMBRES, ADMIN_APELLIDOS.

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const requiredEnv = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "ADMIN_USUARIO",
  "ADMIN_CORREO",
  "ADMIN_PASSWORD",
  "ADMIN_NOMBRES",
  "ADMIN_APELLIDOS",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno ${key}`);
    process.exit(1);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4_unicode_ci",
});

async function main() {
  const claveHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  const conn = await pool.getConnection();
  try {
    await conn.query(
      "CALL SP_USUARIO_CREAR(?, ?, ?, ?, ?, ?, @id_usuario_nuevo, @usuario_generado)",
      [
        process.env.ADMIN_USUARIO,
        process.env.ADMIN_CORREO,
        claveHash,
        process.env.ADMIN_NOMBRES,
        process.env.ADMIN_APELLIDOS,
        null,
      ],
    );
    const [[{ id_usuario_nuevo: idUsuario, usuario_generado: usuarioGenerado }]] = await conn.query(
      "SELECT @id_usuario_nuevo AS id_usuario_nuevo, @usuario_generado AS usuario_generado",
    );

    const [[rol]] = await conn.query(
      "SELECT ID_ROL FROM ROL WHERE CODIGO = 'SUPER_ADMIN' LIMIT 1",
    );
    if (!rol) {
      throw new Error("No se encontro el rol SUPER_ADMIN. Aplica db/seed/001_catalogos_base.sql primero.");
    }

    await conn.query("CALL SP_USUARIO_ROL_ASIGNAR(?, ?, 1)", [idUsuario, rol.ID_ROL]);

    console.log(`Usuario administrador creado: ID_USUARIO=${idUsuario}, USUARIO=${usuarioGenerado}`);
  } finally {
    conn.release();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
