import type { Frase } from "../i18n/idioma";
import type { EscenaArreglo, ItemPanel, PasoEscena } from "./escena";

/**
 * Búsqueda binaria: el algoritmo que todo el mundo cree saber escribir.
 *
 * Dos cosas lo hacen valer la pena como demostración. La primera es el ritmo:
 * cada paso tira la mitad de lo que queda, y eso no se entiende leyéndolo, se
 * entiende viendo cuánto arreglo se apaga de golpe. La segunda es que tiene una
 * precondición que nadie verifica —el arreglo tiene que estar ordenado— y
 * cuando no se cumple no falla: <b>contesta mal</b>, con la misma seguridad.
 */

const ORDENADO = [
  4, 9, 13, 18, 21, 27, 30, 34, 39, 41, 46, 52, 55, 58, 63, 67, 70, 74, 79, 83, 88, 91,
  95, 99, 104, 108, 112, 117, 121, 126, 130, 137,
];

export function correrBinaria(escenario: string): PasoEscena[] {
  const desordenado = escenario === "desordenado";
  const arreglo = desordenado ? [...ORDENADO].reverse() : ORDENADO;
  const objetivo = escenario === "noesta" ? 100 : 88;

  let lo = 0;
  let hi = arreglo.length - 1;
  let medio = -1;
  let hallada = -1;
  let vueltas = 0;

  const pasos: PasoEscena[] = [];

  const escena = (): EscenaArreglo => ({
    tipo: "arreglo",
    celdas: arreglo.map((valor, i) => ({
      valor,
      estado:
        i === hallada
          ? "hallada"
          : i < lo || i > hi
            ? "fuera"
            : i === medio
              ? "medio"
              : "rango",
    })),
    punteros:
      hallada >= 0
        ? [{ nombre: { es: "acá", en: "here" }, indice: hallada }]
        : lo > hi
          ? []
          : [
              { nombre: "lo", indice: lo },
              { nombre: { es: "medio", en: "mid" }, indice: medio < 0 ? lo : medio },
              { nombre: "hi", indice: hi },
            ],
  });

  const panel = (): ItemPanel[] => {
    const quedan = Math.max(0, hi - lo + 1);
    return [
      {
        clave: { es: "objetivo", en: "target" },
        texto: String(objetivo),
        destacado: true,
      },
      {
        clave: "lo",
        texto: { es: `índice ${lo}`, en: `index ${lo}` },
        nota:
          arreglo[lo] !== undefined
            ? { es: `vale ${arreglo[lo]}`, en: `holds ${arreglo[lo]}` }
            : { es: "fuera", en: "out of range" },
      },
      {
        clave: "hi",
        texto: { es: `índice ${hi}`, en: `index ${hi}` },
        nota:
          arreglo[hi] !== undefined
            ? { es: `vale ${arreglo[hi]}`, en: `holds ${arreglo[hi]}` }
            : { es: "fuera", en: "out of range" },
      },
      {
        clave: { es: "candidatos", en: "candidates" },
        texto: {
          es: `${quedan} de ${arreglo.length}`,
          en: `${quedan} of ${arreglo.length}`,
        },
        nota: quedan
          ? {
              es: `descartados ${arreglo.length - quedan}`,
              en: `${arreglo.length - quedan} ruled out`,
            }
          : { es: "no queda ninguno", en: "none left" },
      },
    ];
  };

  const paso = (linea: number, texto: Frase) =>
    pasos.push({ linea, texto, escena: escena(), panel: panel() });

  paso(
    2,
    desordenado
      ? {
          es: `${arreglo.length} números y busco el <b>${objetivo}</b>, que <b>está en el arreglo</b> — se ve ahí. El detalle es que este arreglo está ordenado al revés, y la búsqueda binaria no tiene forma de enterarse: no mira más que las celdas que le tocan.`,
          en: `${arreglo.length} numbers, and I am looking for <b>${objetivo}</b>, which <b>is in the array</b> — you can see it there. The catch is that this array is sorted backwards, and binary search has no way of finding out: it never looks beyond the cells it lands on.`,
        }
      : {
          es: `${arreglo.length} números ordenados y busco el <b>${objetivo}</b>. Todo el arreglo es candidato: <code>lo</code> en la primera celda, <code>hi</code> en la última.`,
          en: `${arreglo.length} sorted numbers, and I am looking for <b>${objetivo}</b>. The whole array is a candidate: <code>lo</code> on the first cell, <code>hi</code> on the last.`,
        },
  );

  while (lo <= hi) {
    vueltas++;
    // El desbordamiento del que habla el listado no puede pasar acá —son 32
    // celdas— pero la forma correcta es la misma, y es la única que se escribe.
    medio = lo + Math.floor((hi - lo) / 2);
    const valor = arreglo[medio]!;

    paso(7, {
      es: `Miro el del medio, <b>${valor}</b> en la posición ${medio}. <em>Es la única celda que voy a leer en toda esta vuelta.</em>`,
      en: `I look at the middle one, <b>${valor}</b> at position ${medio}. <em>It is the only cell I will read in this entire pass.</em>`,
    });

    if (valor === objetivo) {
      hallada = medio;
      paso(9, {
        es: `Es <b>${objetivo}</b>. Está en la posición <b>${medio}</b>, y llegué en ${vueltas} ${vueltas === 1 ? "vuelta" : "vueltas"}.`,
        en: `It is <b>${objetivo}</b>. It sits at position <b>${medio}</b>, and I got there in ${vueltas} ${vueltas === 1 ? "pass" : "passes"}.`,
      });
      break;
    }

    const descartadas = valor < objetivo ? medio - lo + 1 : hi - medio + 1;

    if (valor < objetivo) {
      const antes = lo;
      lo = medio + 1;
      paso(10, {
        es: `<b>${valor}</b> es menor que ${objetivo}. Si el arreglo está ordenado, entonces todo lo que está a la izquierda también lo es: <b>${descartadas} celdas afuera de una sola comparación</b>, de la ${antes} a la ${medio}.`,
        en: `<b>${valor}</b> is smaller than ${objetivo}. If the array is sorted, then everything to the left is smaller too: <b>${descartadas} cells gone on a single comparison</b>, from ${antes} to ${medio}.`,
      });
    } else {
      const antes = hi;
      hi = medio - 1;
      paso(11, {
        es: `<b>${valor}</b> es mayor que ${objetivo}. Entonces sobra toda la mitad de arriba: <b>${descartadas} celdas afuera</b>, de la ${medio} a la ${antes}.`,
        en: `<b>${valor}</b> is greater than ${objetivo}. So the entire upper half is surplus: <b>${descartadas} cells gone</b>, from ${medio} to ${antes}.`,
      });
    }
  }

  if (hallada < 0) {
    medio = -1;
    paso(14, {
      es: `Se cruzaron <code>lo</code> y <code>hi</code>: no queda ni una celda por mirar. La respuesta es <b>no está</b>.`,
      en: `<code>lo</code> and <code>hi</code> crossed: there is not a single cell left to look at. The answer is <b>not present</b>.`,
    });
  }

  // ── Cierre ─────────────────────────────────────────────────────────────
  const tope = Math.ceil(Math.log2(arreglo.length + 1));

  pasos.push({
    linea: 0,
    texto:
      hallada >= 0
        ? { es: `Encontrado.`, en: `Found.` }
        : { es: `No está.`, en: `Not there.` },
    escena: escena(),
    panel: panel(),
    veredicto: desordenado
      ? {
          es: `Contestó <b>«no está»</b> en ${vueltas} vueltas, con toda seguridad, sobre un arreglo <b>donde el ${objetivo} está</b>. No hay bug: el algoritmo cumplió su contrato y quien lo llamó incumplió el suyo. <em>Ninguna implementación real verifica que el arreglo esté ordenado</em>, porque comprobarlo cuesta O(n) y tirar por la borda la ventaja entera. Por eso la precondición es del que llama.`,
          en: `It answered <b>«not there»</b> in ${vueltas} passes, with total confidence, on an array <b>where ${objetivo} is present</b>. There is no bug: the algorithm kept its contract and the caller broke theirs. <em>No real implementation checks that the array is sorted</em>, because checking costs O(n) and throws the entire advantage away. That is why the precondition belongs to the caller.`,
        }
      : hallada >= 0
        ? {
            es: `<b>${vueltas}</b> vueltas para ${arreglo.length} elementos, leyendo ${vueltas} celdas de ${arreglo.length}. El techo es log₂(n): con un millón de elementos serían <b>20</b>, y con los 35 millones del padrón electoral argentino, <b>25</b>. <em>Duplicar los datos agrega un solo paso.</em>`,
            en: `<b>${vueltas}</b> passes for ${arreglo.length} elements, reading ${vueltas} cells out of ${arreglo.length}. The ceiling is log₂(n): with a million elements it would be <b>20</b>, and with the 35 million people on Argentina's electoral roll, <b>25</b>. <em>Doubling the data adds a single step.</em>`,
          }
        : {
            es: `<b>${vueltas}</b> vueltas para descartar los ${arreglo.length}, el mismo techo de log₂(n) ≈ ${tope}. Fijate que no hizo falta recorrer nada: <em>afirmar que algo no está cuesta lo mismo que encontrarlo</em>, y en una lista sin ordenar habría costado mirar las ${arreglo.length}.`,
            en: `<b>${vueltas}</b> passes to rule out all ${arreglo.length}, the same log₂(n) ≈ ${tope} ceiling. Notice that nothing had to be traversed: <em>proving something is absent costs the same as finding it</em>, and in an unsorted list it would have cost looking at all ${arreglo.length}.`,
          },
  });

  return pasos;
}
