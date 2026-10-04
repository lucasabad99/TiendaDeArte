import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Tienda from './pages/Tienda'
import AdminApp from './admin/AdminApp'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Tienda />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
