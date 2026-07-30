import { asegurarTipoCambioDelDia } from "@/lib/facturacion/tipo-cambio-sunat";
import { asegurarInstanciasGeneradasDelDia } from "@/lib/pagos-recurrentes/auto-generar";

// Dispara el sync diario del TC SUNAT (fetch + cache + fijar las 4
// categorias con el TC venta) y la generacion diaria de instancias
// pendientes de Pagos Recurrentes la primera vez que alguien entra a
// CUALQUIER pantalla de Facturacion ese dia -- no solo
// /facturacion/tipo-cambio o /facturacion/pagos-recurrentes -- para que
// sea lo mas parecido a "automatico" posible sin un cron real (ver
// asegurarTipoCambioDelDia/asegurarInstanciasGeneradasDelDia). No-op para
// el resto de requests del dia.
export default async function FacturacionLayout({ children }: { children: React.ReactNode }) {
  await asegurarTipoCambioDelDia();
  await asegurarInstanciasGeneradasDelDia();
  return <>{children}</>;
}
