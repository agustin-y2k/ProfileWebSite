import { SkipLink } from "@sites/ui";
import { Header } from "./components/Header";
import { WhatsAppFab } from "./components/WhatsAppFab";
import { Hero } from "./sections/Hero";
import { Process } from "./sections/Process";
import { Services } from "./sections/Services";
import { Pricing } from "./sections/Pricing";
import { Testimonials } from "./sections/Testimonials";
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
        {/* El proceso va antes de los servicios: responde «¿cuánto me va a
            salir?» antes de que el precio aparezca en pantalla. */}
        <Process />
        <Services />
        <Pricing />
        {/* No renderiza nada mientras no haya testimonios reales cargados. */}
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
