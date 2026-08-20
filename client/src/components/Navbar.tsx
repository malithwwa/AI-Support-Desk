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
    <nav className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
      <span className="text-sm font-bold text-zinc-900">Helpdesk</span>
      <div className="flex items-center gap-4">
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