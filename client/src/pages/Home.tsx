import { useSession } from '../lib/auth-client'

function Home() {
  const { data: session } = useSession()

  return (
    <main className="p-8 text-left">
      <h1 className="mb-2 text-[32px] font-medium text-zinc-900">
        Welcome, {session?.user.name}!
      </h1>
      <p className="m-0 text-gray-500">You are signed in as {session?.user.email}.</p>
    </main>
  )
}

export default Home