/**
 * Preguntas frecuentes.
 *
 * Cada respuesta sale de información que ya estaba publicada en el sitio.
 * Antes de sumar más (plazos, garantía, formas de pago), conviene que las
 * revise Ramiro: son compromisos comerciales, no texto de relleno.
 */
export type FaqItem = { question: string; answer: string };

export const faq: readonly FaqItem[] = [
  {
    question: "¿Atienden a domicilio?",
    answer:
      "Sí. El servicio se hace en taller o a domicilio, según lo que necesite el equipo y lo que te quede más cómodo.",
  },
  {
    question: "¿Dónde están ubicados?",
    answer:
      "En San Rafael, Mendoza: Dr. Carlos Pellegrini 1157, depto. 3. Conviene escribir por WhatsApp antes de acercarse.",
  },
  {
    question: "¿El desbloqueo de las notebooks del gobierno es definitivo?",
    answer:
      "Sí, es un desbloqueo definitivo. Además se hace una puesta a punto del sistema para que el equipo quede usable para estudiar o trabajar.",
  },
  {
    question: "¿Siempre se pueden recuperar los datos de un disco dañado?",
    answer:
      "No siempre. La recuperación queda sujeta a evaluación técnica: primero se revisa el medio y recién ahí se puede decir si los archivos son rescatables.",
  },
  {
    question: "¿Los precios de la lista son finales?",
    answer:
      "Son precios de referencia para orientarte. El valor exacto depende del diagnóstico y de los insumos que haga falta reemplazar; te lo confirmo antes de empezar.",
  },
];
