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
    <nav className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
      <Link to="/" className="text-md font-bold text-zinc-900">
        Helpdesk
      </Link>
      <div className="flex items-center gap-4">
        {session?.user.role === 'ADMIN' && (
          <Link
            to="/users"
            className="text-[13px] text-zinc-900 transition hover:text-zinc-500"
          >
            Users
          </Link>
        )}
        <span className="text-[13px] text-gray-500">{session?.user.name}</span>
        <button
          className="cursor-pointer rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-[13px] text-zinc-900 transition hover:bg-zinc-100"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default Navbar