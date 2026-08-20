export type PriceRow = {
  /** Coincide con `Service.id`: permite saltar de la tarjeta a su tarifa. */
  id: string;
  service: string;
  price: string;
  note?: string;
  negotiable?: boolean;
};

export const pricing: readonly PriceRow[] = [
  { id: "gobierno", service: "Desbloqueo Notebooks Gobierno", price: "$35.000" },
  { id: "tecnico", service: "Servicio Técnico General", price: "$25.000" },
  { id: "hardware", service: "Reparación de Hardware", price: "Desde $30.000" },
  { id: "upgrade", service: "Upgrades & SSD", price: "$15.000", note: "+ insumos" },
  {
    id: "datos",
    service: "Recuperación de Datos",
    price: "$30.000",
    note: "si es recuperable",
  },
  {
    id: "web",
    service: "Programación Web & Scripts",
    price: "Negociable",
    negotiable: true,
  },
  { id: "redes", service: "Redes y Servidores", price: "Negociable", negotiable: true },
];
