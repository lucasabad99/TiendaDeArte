import { CartProvider } from '../context/CartContext'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Galeria from '../components/Galeria'
import SobreMi from '../components/SobreMi'
import Contacto from '../components/Contacto'
import Footer from '../components/Footer'
import CarritoDrawer from '../components/CarritoDrawer'

// La tienda pública: lo que ve cualquier visitante en "/"
export default function Tienda() {
  return (
    <CartProvider>
      <Navbar />
      <main>
        <Hero />
        <Galeria />
        <SobreMi />
        <Contacto />
      </main>
      <Footer />
      <CarritoDrawer />
    </CartProvider>
  )
}
