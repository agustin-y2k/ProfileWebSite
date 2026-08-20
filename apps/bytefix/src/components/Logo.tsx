import styles from "./Logo.module.css";

/** «Byte» en el color del texto, «Fix» en el cian de marca, igual que el favicon. */
export function Logo() {
  return (
    <a className={styles.logo} href="#top">
      Byte<span className={styles.fix}>Fix</span>
    </a>
  );
}
