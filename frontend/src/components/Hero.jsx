export default function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="contenedor hero__inner">
        <div className="hero__texto">
          <p className="eyebrow">Obras originales · Ediciones limitadas</p>
          <h1>Arte para habitar los espacios</h1>
          <p className="hero__bajada">
            Pinturas, acuarelas y láminas hechas a mano en el taller. Cada pieza original es única.
          </p>
          <div className="hero__acciones">
            <a href="#obras" className="btn btn--primario">Ver obras</a>
            <a href="#contacto" className="btn btn--secundario">Encargar una obra</a>
          </div>
        </div>
        <div className="hero__imagen">
          <img src="https://picsum.photos/seed/taller/800/1000" alt="Obra destacada del taller" />
        </div>
      </div>
    </section>
  )
}
