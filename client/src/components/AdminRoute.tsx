import { Navigate, Outlet } from 'react-router'
import { useSession } from '../lib/auth-client'

function AdminRoute() {
  const { data: session, isPending } = useSession()

  if (isPending) return null
  if (session?.user.role !== 'ADMIN') return <Navigate to="/" replace />

  return <Outlet />
}

export default AdminRoute
