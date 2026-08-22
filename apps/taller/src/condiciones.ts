/**
 * Condiciones impresas al pie del comprobante.
 *
 * ⚠️ Esto son compromisos comerciales, no texto de relleno. Lo que se imprime
 * acá queda firmado por el cliente y es oponible a ByteFix.
 *
 * Las tres que están activas no dicen nada nuevo: son exactamente lo que
 * bytefix.shop ya publica en su sección de proceso y en las preguntas
 * frecuentes. Por eso se pueden emitir sin que nadie las revise.
 *
 * Se evaluó agregar tres más —garantía de 30 días, plazo de guarda de equipos
 * no retirados y responsabilidad sobre los datos— y Ramiro decidió no
 * incluirlas. Son compromisos nuevos, y una cláusula que limite
 * responsabilidad frente a un consumidor puede ser nula por abusiva (Ley
 * 24.240, art. 37) y dejar peor que no haberla puesto. Si alguna vez se suman,
 * que sea después de que las mire alguien de derecho.
 */
export const condiciones: readonly string[] = [
  "Los precios de la lista son de referencia. El valor exacto depende del diagnóstico y de los insumos que haga falta reemplazar, y se confirma antes de empezar.",
  "No se realiza ningún trabajo sin la aprobación previa del presupuesto.",
  "La recuperación de datos queda sujeta a evaluación técnica: recién después de revisar el medio se puede decir si los archivos son rescatables.",
];
