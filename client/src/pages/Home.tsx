import { useSession } from '../lib/auth-client'

function Home() {
  const { data: session } = useSession()

  return (
    <main className="home-main">
      <h1>Welcome, {session?.user.name}!</h1>
      <p>You are signed in as {session?.user.email}.</p>
    </main>
  )
}

export default Home