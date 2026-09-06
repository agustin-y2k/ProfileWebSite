import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@sites/ui";
import type { Clip as Grabacion } from "../data/clip";
import styles from "./Clip.module.css";

/**
 * El clip del flujo de reserva, en bucle y sin sonido.
 *
 * Arranca solo cuando entra en pantalla, y no antes: con `preload="none"`, un
 * visitante que no llega hasta acá no se descarga el megabyte, y en un teléfono
 * —donde el clip está oculto— no se descarga nunca. Al salir de pantalla se
 * pausa, que además le devuelve el procesador a quien sigue leyendo.
 *
 * Los controles van siempre. Sin JavaScript son la única forma de verlo, y con
 * JavaScript siguen sirviendo para volver atrás sobre un paso que pasó rápido.
 */
export function Clip({ clip }: { clip: Grabacion }) {
  const video = useRef<HTMLVideoElement>(null);
  const quieto = usePrefersReducedMotion();

  useEffect(() => {
    const nodo = video.current;
    if (!nodo || typeof IntersectionObserver === "undefined") return;

    // Quien pidió menos movimiento no recibe un video que arranca solo: le
    // queda el póster y los controles, y lo mira si quiere.
    if (quieto) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada) return;
        if (entrada.isIntersecting) {
          // Un video solo puede arrancar sin que nadie lo pida si no suena, y
          // la política del navegador mira la propiedad del elemento, no el
          // atributo del HTML: se la fija acá, justo antes de pedir play.
          nodo.muted = true;
          void nodo.play().catch(() => {});
        } else {
          nodo.pause();
        }
      },
      { threshold: 0.35 },
    );

    observador.observe(nodo);
    return () => observador.disconnect();
  }, [quieto]);

  return (
    <figure className={styles.marco}>
      <video
        ref={video}
        className={styles.video}
        width={clip.ancho}
        height={clip.alto}
        poster={clip.poster}
        preload="none"
        muted
        loop
        playsInline
        controls
      >
        <source src={clip.webm} type="video/webm" />
        <source src={clip.mp4} type="video/mp4" />
      </video>
      <figcaption className={styles.pie}>{clip.descripcion}</figcaption>
    </figure>
  );
}
