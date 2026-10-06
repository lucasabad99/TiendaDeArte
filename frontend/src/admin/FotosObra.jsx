import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subirFotos } from '../services/adminService'

const MAX_FOTOS = 12
const MAX_MB = 10

// Fotos de una obra: elegirlas del explorador de archivos (o arrastrarlas), ordenarlas y quitarlas.
// Las fotos se suben a Cloudinary apenas se eligen; la obra guarda las URLs al tocar "Guardar".
// fotos: [url] (la primera es la principal) · onChange(nuevasFotos) · onSubiendo(bool)
export default function FotosObra({ fotos, onChange, onSubiendo }) {
  const { manejarError } = useAuth()
  const input = useRef(null)
  const [subiendo, setSubiendo] = useState(0) // cuántas se están subiendo
  const [error, setError] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [rotas, setRotas] = useState([]) // URLs que el navegador no pudo mostrar
  const [link, setLink] = useState('')

  async function agregarArchivos(lista) {
    setError(null)
    const archivos = [...lista]
    if (archivos.length === 0) return

    const noFotos = archivos.filter((a) => !a.type.startsWith('image/'))
    const pesadas = archivos.filter((a) => a.size > MAX_MB * 1024 * 1024)
    if (noFotos.length) return setError(`No son fotos: ${noFotos.map((a) => a.name).join(', ')}.`)
    if (pesadas.length) return setError(`Pesan más de ${MAX_MB} MB: ${pesadas.map((a) => a.name).join(', ')}.`)
    if (fotos.length + archivos.length > MAX_FOTOS) return setError(`Máximo ${MAX_FOTOS} fotos por obra (ya hay ${fotos.length}).`)

    setSubiendo(archivos.length)
    onSubiendo?.(true)
    try {
      const subidas = await subirFotos(archivos)
      onChange([...fotos, ...subidas.map((s) => s.url)])
    } catch (err) {
      setError(manejarError(err))
    } finally {
      setSubiendo(0)
      onSubiendo?.(false)
      if (input.current) input.current.value = '' // permite volver a elegir el mismo archivo
    }
  }

  function agregarLink() {
    const url = link.trim()
    if (!/^https?:\/\/\S+$/.test(url)) return setError('El link tiene que empezar con http:// o https://')
    if (fotos.length >= MAX_FOTOS) return setError(`Máximo ${MAX_FOTOS} fotos por obra.`)
    setError(null)
    onChange([...fotos, url])
    setLink('')
  }

  const quitar = (i) => onChange(fotos.filter((_, j) => j !== i))
  const hacerPrincipal = (i) => onChange([fotos[i], ...fotos.filter((_, j) => j !== i)])

  const soltar = (e) => {
    e.preventDefault()
    setArrastrando(false)
    if (!subiendo) agregarArchivos(e.dataTransfer.files)
  }

  return (
    <div className="fotos">
      <span className="fotos__titulo">Fotos</span>

      <div
        className={`fotos__zona ${arrastrando ? 'fotos__zona--activa' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
      >
        <button type="button" className="btn btn--secundario" onClick={() => input.current?.click()} disabled={subiendo > 0}>
          {subiendo ? `Subiendo ${subiendo} ${subiendo === 1 ? 'foto' : 'fotos'}…` : 'Elegir fotos'}
        </button>
        <p className="texto-suave">o arrastralas acá · JPG, PNG o HEIC, hasta {MAX_MB} MB cada una</p>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => agregarArchivos(e.target.files)} />
      </div>

      {error && <p className="aviso aviso--error" role="alert">{error}</p>}

      {fotos.length > 0 ? (
        <ul className="fotos__lista">
          {fotos.map((url, i) => (
            <li key={url} className="fotos__item">
              {rotas.includes(url) ? (
                <div className="fotos__rota">No se pudo cargar</div>
              ) : (
                <img src={url} alt={`Foto ${i + 1}`} loading="lazy" onError={() => setRotas((r) => [...r, url])} />
              )}
              <button type="button" className="fotos__quitar" onClick={() => quitar(i)} aria-label={`Quitar foto ${i + 1}`}>✕</button>
              {i === 0 ? (
                <span className="fotos__principal">Principal</span>
              ) : (
                <button type="button" className="fotos__hacer-principal" onClick={() => hacerPrincipal(i)}>Hacer principal</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="texto-suave fotos__vacio">Todavía no hay fotos. La primera que agregues va a ser la principal (la que se ve en la tienda).</p>
      )}

      <details className="fotos__link">
        <summary>¿La foto ya está en internet? Pegar un link</summary>
        <div className="fotos__link-fila">
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" aria-label="Link de la foto"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarLink() } }} />
          <button type="button" className="btn btn--secundario btn--chico" onClick={agregarLink}>Agregar</button>
        </div>
      </details>
    </div>
  )
}
