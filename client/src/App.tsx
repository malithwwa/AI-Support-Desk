import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState<string>('Checking API...')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    async function load() {
      try {
        const healthRes = await fetch('/api/health')
        const healthData = await healthRes.json()
        setHealth(`${healthData.status} at ${new Date(healthData.timestamp).toLocaleTimeString()}`)

        const msgRes = await fetch('/api/message')
        const msgData = await msgRes.json()
        setMessage(msgData.message)
      } catch {
        setHealth('API unreachable — is the server running?')
      }
    }
    void load()
  }, [])

  return (
    <main className="app">
      <h1>Helpdesk</h1>
      <p className="status">API status: {health}</p>
      <p className="message">{message}</p>
    </main>
  )
}

export default App
