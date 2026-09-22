import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Por defecto un Server Action acepta 1MB de cuerpo -- no alcanza
      // para PDFs escaneados (contratos firmados subidos, compromisos de
      // prestamo firmados). El limite real por archivo lo valida cada
      // accion.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
