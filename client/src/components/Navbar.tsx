import { useNavigate } from 'react-router'
import { signOut, useSession } from '../lib/auth-client'

function Navbar() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">Helpdesk</span>
      <div className="navbar-right">
        <span className="navbar-user">{session?.user.name}</span>
        <button className="navbar-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default Navbar