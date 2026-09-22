// Mismo patron que IconoAlertaVencimiento.tsx: SVG con <title> para
// tooltip nativo, sin JS adicional. Se usa en la ficha del directorio
// para avisar (solo a quien puede ver el resumen gerencial, ver
// puedeVerResumenGerencialFicha) que la persona tiene prestamos o
// adelantos de sueldo activos, sin tener que entrar a Planilla > Prestamos.
function formatearMonto(monto: number, codigo: string): string {
  return `${codigo === "USD" ? "US$" : "S/"} ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function IconoPrestamosActivos({ cantidad, pendientePorMoneda }: { cantidad: number; pendientePorMoneda: { codigo: string; monto: number }[] }) {
  const detalle = pendientePorMoneda.map((p) => formatearMonto(p.monto, p.codigo)).join(" + ");

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true">
      <title>{`${cantidad} prestamo(s)/adelanto(s) activo(s) -- ${detalle} pendiente`}</title>
      <path d="M4 4a2 2 0 00-2 2v1.161c.34-.101.699-.161 1.071-.161h13.858c.372 0 .731.06 1.071.161V6a2 2 0 00-2-2H4z" />
      <path
        fillRule="evenodd"
        d="M2 8.5a1 1 0 011-1h14a1 1 0 011 1V13a2 2 0 01-2 2H4a2 2 0 01-2-2V8.5zM10 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        clipRule="evenodd"
      />
    </svg>
  );
}
