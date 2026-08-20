import { SkipLink } from "@sites/ui";
import { Header } from "./components/Header";
import { Hero } from "./sections/Hero";
import { Services } from "./sections/Services";
import { Pricing } from "./sections/Pricing";
import { Faq } from "./sections/Faq";
import { Contact } from "./sections/Contact";
import { Footer } from "./sections/Footer";

export function App() {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="contenido">
        <Hero />
        <Services />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
