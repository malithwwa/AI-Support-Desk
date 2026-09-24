import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { TicketsTable, TicketsTableSkeleton } from '@/components/TicketsTable'
import type { Ticket } from '@/lib/tickets'

interface TicketsResponse {
  tickets: Ticket[]
}

async function fetchTickets() {
  const { data } = await axios.get<TicketsResponse>('/api/tickets', {
    withCredentials: true,
  })
  return data.tickets
}

function Tickets() {
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  })

  if (isLoading) {
    return (
      <main className="flex flex-col items-center p-8 text-left">
        <div className="w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-zinc-900">Tickets</h1>
          </div>
          <TicketsTableSkeleton />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-col items-center p-8 text-left">
        <div className="w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-zinc-900">Tickets</h1>
          </div>
          <p className="text-[13px] text-destructive">Failed to load tickets</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center p-8 text-left">
      <div className="w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900">Tickets</h1>
        </div>
        <TicketsTable tickets={tickets} />
      </div>
    </main>
  )
}

export default Tickets