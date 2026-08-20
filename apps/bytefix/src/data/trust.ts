/**
 * Testimonios de clientes.
 *
 * El array arranca vacío y la sección no se renderiza mientras lo esté: es
 * preferible no mostrar nada a mostrar reseñas de ejemplo. Un testimonio
 * inventado en un sitio comercial es una afirmación falsa sobre el negocio,
 * y los placeholders tienen la costumbre de sobrevivir hasta producción.
 *
 * Para publicar, agregar entradas reales:
 *
 *   { name: "Nombre del cliente", text: "Lo que dijo", service: "Qué se le hizo" }
 *
 * Conviene pedir permiso antes de publicar el nombre de alguien.
 */
export type Testimonial = {
  name: string;
  text: string;
  /** Opcional: qué trabajo se hizo, para dar contexto. */
  service?: string;
};

export const testimonials: readonly Testimonial[] = [];

/**
 * Cómo es el proceso de principio a fin.
 *
 * Todo esto sale de cómo ya se trabaja y de lo que el sitio ya afirmaba:
 * diagnóstico previo, presupuesto confirmado antes de empezar, y trabajo en
 * taller o a domicilio. No hay promesas nuevas acá.
 */
export type Step = {
  number: string;
  title: string;
  description: string;
};

export const process: readonly Step[] = [
  {
    number: "01",
    title: "Me escribís",
    description:
      "Por WhatsApp, con el modelo del equipo y qué síntoma tiene. Cuanto más concreto, mejor puedo orientarte antes de que te muevas.",
  },
  {
    number: "02",
    title: "Diagnóstico",
    description:
      "Reviso el equipo y te digo qué tiene, si tiene arreglo y qué conviene hacer. Si no vale la pena repararlo, te lo digo.",
  },
  {
    number: "03",
    title: "Presupuesto antes de tocar nada",
    description:
      "Te paso el precio final, con los insumos que hagan falta. Recién cuando lo aprobás empiezo a trabajar.",
  },
  {
    number: "04",
    title: "Reparación y entrega",
    description:
      "En taller o a domicilio, según lo que necesite el equipo. Te explico qué se hizo y qué conviene cuidar de ahí en adelante.",
  },
];
