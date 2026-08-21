import { SkipLink } from "@sites/ui";
import { Header } from "./components/Header";
import { Hero } from "./sections/Hero";
import { Work } from "./sections/Work";
import { ByteFixBand } from "./sections/ByteFixBand";
import { About } from "./sections/About";
import { Projects } from "./sections/Projects";
import { Contact } from "./sections/Contact";
import { Footer } from "./sections/Footer";

export function App() {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="contenido">
        <Hero />
        <Work />
        <ByteFixBand />
        <About />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
