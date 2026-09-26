import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { SortingState } from '@tanstack/react-table'
import { TicketsTable, TicketsTableSkeleton } from '@/components/TicketsTable'
import type { Ticket } from '@/lib/tickets'

interface TicketsResponse {
  tickets: Ticket[]
}

async function fetchTickets(sorting: SortingState) {
  const sort = sorting[0]
  const { data } = await axios.get<TicketsResponse>('/api/tickets', {
    params: {
      sortBy: sort?.id ?? 'createdAt',
      sortDir: sort ? (sort.desc ? 'desc' : 'asc') : 'desc',
    },
    withCredentials: true,
  })
  return data.tickets
}

function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['tickets', sorting],
    queryFn: () => fetchTickets(sorting),
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
        <TicketsTable tickets={tickets} sorting={sorting} onSortingChange={setSorting} />
      </div>
    </main>
  )
}

export default Tickets