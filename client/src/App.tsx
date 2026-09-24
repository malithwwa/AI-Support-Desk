import { Routes, Route, Navigate } from 'react-router'
import Login from './pages/Login'
import Home from './pages/Home'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Users from './pages/Users'
import Tickets from './pages/Tickets'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/tickets" element={<Tickets />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route element={<Layout />}>
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App