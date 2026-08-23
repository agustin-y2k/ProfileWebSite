import { Container, Section } from "@sites/ui";
import { cuerpoDeTarifas } from "../data/pricing";
import styles from "./Pricing.module.css";

export function Pricing() {
  return (
    <Section id="precios" labelledBy="precios-titulo" tone="alt">
      <Container>
        <header className={styles.head}>
          <p className="label">Tarifas</p>
          <h2 id="precios-titulo" className={styles.title}>
            Precios de referencia
          </h2>
          <p className={styles.intro}>
            Valores base para que sepas con qué te vas a encontrar. El precio final
            depende del diagnóstico y de los insumos; siempre te lo confirmo antes de
            empezar.
          </p>
        </header>

        {/* Sigue siendo una <table> real: son datos tabulares y los lectores de
            pantalla los anuncian con su encabezado de columna. Con solo dos
            columnas entra sin scroll horizontal incluso en 320px. */}
        <table className={styles.table}>
          <caption className={styles.caption}>
            Tarifas de referencia de ByteFix, en pesos argentinos
          </caption>
          <thead>
            <tr>
              <th scope="col">Servicio</th>
              <th scope="col" className={styles.priceHead}>
                Precio base
              </th>
            </tr>
          </thead>
          {/* Las filas las pone nginx con SSI, pidiéndoselas al sistema de
              órdenes por la red interna de Docker (ver `data/pricing.ts` y
              `nginx.conf`). React no hidrata los hijos de un nodo con
              `dangerouslySetInnerHTML`, así que lo que insertó el servidor
              queda como está: el cliente no lo pisa con lo del build. */}
          <tbody
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: cuerpoDeTarifas }}
          />
        </table>
      </Container>
    </Section>
  );
}
