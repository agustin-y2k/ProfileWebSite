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
                es: "El caso del mapa, en la vida real",
                en: "The map case, out in the real world",
              })}
            </h2>
            <p className={styles.introSeccion}>
              {t({
                es: "Los cuatro que cruzan el tablero —Dijkstra, A*, BFS y DFS— no son ejercicios de facultad: son lo que corre abajo de cosas que usas todos los días.",
                en: "The four that cross the board —Dijkstra, A*, BFS and DFS— are not classroom exercises: they are what runs underneath things you use every day.",
              })}
            </p>

            <div className={styles.usos}>
              <div className={styles.uso}>
                <h3>{t({ es: "Cómo llegar", en: "Getting there" })}</h3>
                <p>
                  {t({
                    es: "El mapa es el grafo y el costo de cada tramo es el tiempo, no la distancia. Por eso el navegador a veces te manda por la avenida larga en vez del atajo con semáforos. Y usa A*, no Dijkstra, porque sí sabe hacia dónde queda el destino.",
                    en: "The map is the graph and the cost of each leg is time, not distance. That is why the navigation app sometimes sends you down the long avenue instead of the shortcut full of traffic lights. And it uses A*, not Dijkstra, because it does know which way the destination lies.",
                  })}
                </p>
              </div>

              <div className={styles.uso}>
                <h3>{t({ es: "Ruteo de red", en: "Network routing" })}</h3>
                <p>
                  {t({
                    es: "OSPF, uno de los protocolos que sostienen internet, hace que cada router arme el mapa de la red y corra Dijkstra sobre él para decidir por dónde sale cada paquete. Ahí no hay heurística posible: no existe «más cerca» en una topología de red.",
                    en: "OSPF, one of the protocols holding the internet up, has every router build the map of the network and run Dijkstra over it to decide which way each packet leaves. No heuristic is possible there: «closer» does not exist in a network topology.",
                  })}
                </p>
              </div>

              <div className={styles.uso}>
                <h3>
                  {t({ es: "Asignar lo que escasea", en: "Allocating what is scarce" })}
                </h3>
                <p>
                  {t({
                    es: "El flujo de costo mínimo —con el que se reparten turnos, salas o equipos entre quienes los piden— usa Dijkstra adentro, una vez por iteración. Es el mismo motor resolviendo algo que no parece un mapa.",
                    en: "Min-cost flow —which is how appointments, rooms or equipment get shared among the people asking for them— runs Dijkstra inside, once per iteration. It is the same engine solving something that does not look like a map at all.",
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
                es: "Tres categorías de cuatro, elegidas para cubrir las dos mitades del oficio: la red que sostiene todo y el programa que corre encima. Algunos entran en más de una y aparecen una sola vez — el cruce es contenido, no un defecto de la clasificación.",
                en: "Three categories of four, picked to cover both halves of the craft: the network holding everything up and the program running on top of it. A few belong to more than one and appear only once — the overlap is content, not a flaw in the classification.",
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
                          {a.tambien && (
                            <p className={styles.entradaTambien}>{t(a.tambien)}</p>
                          )}
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
