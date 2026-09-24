import { Link, useNavigate } from 'react-router'
import { signOut, useSession } from '../lib/auth-client'

function Navbar() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="flex items-center justify-between border-b border-zinc-200 px-6 py-2">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-md font-bold text-zinc-900">
          Helpdesk
        </Link>
        <Link
          to="/tickets"
          className="text-[13px] text-zinc-900 transition hover:text-zinc-500"
        >
          Tickets
        </Link>
        {session?.user.role === 'ADMIN' && (
          <Link
            to="/users"
            className="text-[13px] text-zinc-900 transition hover:text-zinc-500"
          >
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-gray-500">{session?.user.name}</span>
        <button
          className="cursor-pointer rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-[12px] font-semibold text-zinc-900 transition hover:bg-zinc-100"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default Navbar