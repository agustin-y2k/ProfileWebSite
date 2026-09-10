import { Container, SkipLink } from "@sites/ui";
import { Prosa, useIdioma } from "./i18n/contexto";
import { ruta } from "./i18n/idioma";
import { RUTAS } from "./i18n/meta";
import { SelectorIdioma } from "./components/SelectorIdioma";
import { ThemeToggle } from "./components/ThemeToggle";
import { Visualizador } from "./components/Visualizador";
import { CATEGORIAS, deCategoria } from "./algoritmos/definiciones";
import { Footer } from "./sections/Footer";
import { site } from "./data/site";
import styles from "./Algoritmos.module.css";

export function Algoritmos() {
  const { idioma, t } = useIdioma();

  return (
    <div className={styles.pagina}>
      <SkipLink />

      <header className={styles.cabecera}>
        <Container className={styles.cabeceraInner}>
          <a className={styles.volver} href={ruta(idioma, RUTAS.inicio)}>
            <span aria-hidden="true">←</span> {site.name}
          </a>
          <div className={styles.acciones}>
            <SelectorIdioma pagina="algoritmos" />
            <ThemeToggle />
          </div>
        </Container>
      </header>

      <main id="contenido">
        <Container>
          <section className={styles.hero}>
            <p className="label">{t({ es: "Algoritmos", en: "Algorithms" })}</p>
            <h1 className={styles.titulo}>
              {t({
                es: "Doce algoritmos, paso a paso",
                en: "Twelve algorithms, step by step",
              })}
            </h1>
            <Prosa
              className={styles.bajada}
              frase={{
                es: "Redes, estructuras e inteligencia artificial. Cada uno corre aquí mismo con su código al lado y la línea que se está ejecutando resaltada, y cada uno trae escenarios elegidos para mostrar <strong>dónde falla</strong>, no solo dónde funciona: el switch que elige mal la raíz, el router que cuenta hasta infinito, la búsqueda que contesta con toda seguridad una respuesta equivocada.",
                en: "Networking, data structures and artificial intelligence. Each one runs right here with its code alongside and the executing line highlighted, and each one ships with scenarios chosen to show <strong>where it breaks</strong>, not just where it works: the switch that elects the wrong root, the router that counts to infinity, the search that confidently returns the wrong answer.",
              }}
            />
          </section>

          <Visualizador />

          <section className={styles.bloque}>
            <h2 className={styles.tituloSeccion}>
              {t({
                es: "Dónde corre cada uno, en la vida real",
                en: "Where each one runs, out in the real world",
              })}
            </h2>
            <p className={styles.introSeccion}>
              {t({
                es: "Ninguno de los doce es un ejercicio de facultad. Cada uno tiene un equipo, un protocolo o un producto donde corre, y es ahí donde se lo explica acá.",
                en: "Not one of the twelve is a classroom exercise. Each has a box, a protocol or a product where it actually runs, and that is where it gets explained here.",
              })}
            </p>

            <div className={styles.usos}>
              <div className={styles.uso}>
                <h3>{t({ es: "Adentro de un router", en: "Inside a router" })}</h3>
                <p>
                  {t({
                    es: "OSPF, uno de los protocolos que sostienen internet, hace que cada router junte los LSA de toda el área, arme con ellos el mapa completo y corra SPF sobre su propia copia. Lo que sale de ahí no es un camino: es la tabla de ruteo entera, un renglón por destino.",
                    en: "OSPF, one of the protocols holding the internet up, has every router collect the LSAs of its whole area, assemble the complete map from them and run SPF over its own copy. What comes out is not a path: it is the entire routing table, one row per destination.",
                  })}
                </p>
              </div>

              <div className={styles.uso}>
                <h3>{t({ es: "Adentro de un switch", en: "Inside a switch" })}</h3>
                <p>
                  {t({
                    es: "Spanning Tree corre en todo switch administrable que se haya enchufado alguna vez, y su trabajo es apagar puertos a propósito. Sin él, un solo cable de más entre dos switches alcanza para que la red deje de funcionar por completo.",
                    en: "Spanning Tree runs on every managed switch that has ever been plugged in, and its job is to shut ports down on purpose. Without it, a single spare cable between two switches is enough to take the network down entirely.",
                  })}
                </p>
              </div>

              <div className={styles.uso}>
                <h3>
                  {t({ es: "Adentro de un videojuego", en: "Inside a video game" })}
                </h3>
                <p>
                  {t({
                    es: "A* es lo que mueve a un personaje por un mapa sin que se choque contra las paredes ni encare para el lado contrario: la heurística es, literalmente, mirar hacia dónde queda el destino antes de dar el primer paso.",
                    en: "A* is what moves a character across a map without walking into walls or setting off in the wrong direction: the heuristic is, quite literally, looking at where the destination lies before taking the first step.",
                  })}
                </p>
              </div>
            </div>
          </section>

          <section className={styles.bloque}>
            <h2 className={styles.tituloSeccion}>
              {t({ es: "Los doce", en: "All twelve" })}
            </h2>
            <p className={styles.introSeccion}>
              {t({
                es: "Tres categorías de cuatro, elegidas para cubrir las dos mitades del oficio: la red que sostiene todo y el programa que corre encima. Cada uno se explica en la suya, con el dibujo que le corresponde — un router es un router y un tablero es un tablero.",
                en: "Three categories of four, picked to cover both halves of the craft: the network holding everything up and the program running on top of it. Each one is explained inside its own, with the picture that belongs to it — a router is a router and a board is a board.",
              })}
            </p>

            <div className={styles.categorias}>
              {CATEGORIAS.map((categoria) => (
                <div key={categoria.id} className={styles.categoria}>
                  <h3 className={styles.categoriaNombre}>{t(categoria.nombre)}</h3>
                  <p className={styles.categoriaIntro}>{t(categoria.intro)}</p>

                  <div className={styles.entradas}>
                    {deCategoria(categoria.id)
                      .filter((a) => a.indice)
                      .map((a) => (
                        <div key={a.id} className={styles.entrada}>
                          <div className={styles.entradaCabecera}>
                            <span className={styles.entradaNombre}>
                              {t(a.indice!.nombre)}
                            </span>
                            <span className={`${styles.marca} ${styles.marcaListo}`}>
                              {t({
                                es: `${a.escenarios.length} escenarios`,
                                en: `${a.escenarios.length} scenarios`,
                              })}
                            </span>
                          </div>
                          <p className={styles.entradaQue}>{t(a.indice!.que)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
