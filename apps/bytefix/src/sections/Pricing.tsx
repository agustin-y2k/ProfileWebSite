import { Container, Section } from "@sites/ui";
import { pricing } from "../data/pricing";
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
          <tbody>
            {pricing.map((row) => (
              // El id permite que las tarjetas de servicio enlacen su tarifa y
              // que CSS `:target` la resalte: sin JavaScript de por medio.
              <tr key={row.id} id={`tarifa-${row.id}`} className={styles.row}>
                <th scope="row" className={styles.service}>
                  {row.service}
                </th>
                <td className={styles.price}>
                  {row.negotiable ? (
                    <span className={styles.negotiable}>{row.price}</span>
                  ) : (
                    <>
                      <span className={styles.amount}>{row.price}</span>
                      {row.note ? (
                        <small className={styles.note}>{row.note}</small>
                      ) : null}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Container>
    </Section>
  );
}
