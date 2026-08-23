/**
 * Enlace de WhatsApp hacia el teléfono de un cliente.
 *
 * El aviso de "tu equipo está listo" va por WhatsApp y no por correo: todo
 * bytefix.shop empuja a ese canal y es por donde la gente realmente contesta.
 * Un correo diciendo que el equipo está listo tiene buenas chances de no
 * leerse hasta la semana siguiente.
 */

/**
 * Normaliza a E.164 sin `+`, que es lo que espera wa.me.
 *
 * Nadie escribe el teléfono dos veces igual, así que hay que adivinar un poco.
 * Los casos reales en San Rafael son "2604316731" y "260 431-6731"; el prefijo
 * `549` es el de móvil argentino.
 */
export function aE164(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");

  if (digitos.length < 8) return null;
  if (digitos.startsWith("54")) {
    // 54 + 9 + área + número ya está completo; 54 sin el 9 es línea fija
    // marcada como móvil, y wa.me necesita el 9.
    return digitos.startsWith("549") ? digitos : `549${digitos.slice(2)}`;
  }
  if (digitos.startsWith("9")) return `54${digitos}`;
  if (digitos.startsWith("0")) return `549${digitos.slice(1)}`;
  return `549${digitos}`;
}

export function enlaceWhatsapp(telefono: string, mensaje: string): string | null {
  const numero = aE164(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
