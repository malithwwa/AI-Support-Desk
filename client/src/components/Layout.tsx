import { Outlet } from 'react-router'
import Navbar from './Navbar'

function Layout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  )
}

export default Layout