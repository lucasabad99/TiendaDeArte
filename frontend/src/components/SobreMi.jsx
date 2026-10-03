// Texto e imagen de relleno: los reemplazamos con la info que mande la artista.
export default function SobreMi() {
  return (
    <section id="sobre-mi" className="seccion seccion--alterna">
      <div className="contenedor sobre">
        <img className="sobre__foto" src="https://picsum.photos/seed/artista/600/600" alt="La artista en su taller" loading="lazy" />
        <div>
          <p className="eyebrow">Sobre mí</p>
          <h2>Pinto lo que el paisaje me deja adentro</h2>
          <p>
            Soy artista visual y trabajo desde mi taller con óleo, acuarela y técnicas mixtas.
            Mi obra explora la luz, la memoria y los lugares que habitamos.
          </p>
          <p>
            Además de las obras disponibles, realizo encargos personalizados. Escribime y lo charlamos.
          </p>
        </div>
      </div>
    </section>
  )
}
