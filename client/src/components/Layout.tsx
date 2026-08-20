import { Outlet } from 'react-router'
import Navbar from './Navbar'

function Layout() {
  return (
    <div className="home-page">
      <Navbar />
      <Outlet />
    </div>
  )
}

export default Layout