import mysql from "mysql2/promise";

declare global {
  var __gtPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    // El codigo entero asume que las columnas DATE/DATETIME llegan como
    // string ("YYYY-MM-DD"/"YYYY-MM-DD HH:MM:SS") -- ej. FECHA_INGRESO.slice(0,10),
    // new Date(`${fecha}T00:00:00`). Con dateStrings:false mysql2 devuelve
    // objetos Date de JS, que no tienen .slice y que al interpolarse en un
    // template string producen "Invalid Date" en vez de tirar error --
    // bug silencioso en casi todos lados, y un TypeError donde se usa
    // .slice() directo (ver FichaEmpleadoPage).
    dateStrings: true,
    // Debe coincidir con la collation declarada en db/schema/*.sql
    // (utf8mb4_unicode_ci). Si no se fija aqui, la conexion usa la
    // collation por defecto del servidor (utf8mb4_0900_ai_ci en MySQL 8),
    // y cualquier comparacion columna=parametro/literal falla con
    // ER_CANT_AGGREGATE_2COLLATIONS.
    charset: "utf8mb4_unicode_ci",
    // El servidor de BD es remoto (VPS): sin keep-alive, un firewall/NAT
    // intermedio puede cerrar en silencio una conexion del pool que quedo
    // inactiva un rato, y el proximo query revienta con ECONNRESET al
    // reusarla. Con esto el pool manda paquetes TCP keep-alive periodicos
    // para que la conexion no se vea "abandonada".
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    // Si la conexion igual muere entre pings, que falle rapido en vez de
    // colgar el request varios segundos esperando el timeout por defecto.
    connectTimeout: 10_000,
  });
}

// Reutiliza el pool entre hot-reloads en dev (Next.js recarga modulos).
export const pool: mysql.Pool = globalThis.__gtPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__gtPool = pool;
}
