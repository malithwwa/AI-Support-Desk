import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { SortingState } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { TicketsTable, TicketsTableSkeleton } from '@/components/TicketsTable'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Ticket } from '@/lib/tickets'
import type { StatusFilterValue, CategoryFilterValue, TicketStatus } from '@/lib/constants'
import {
  CATEGORY_FILTERS,
  STATUS_FILTERS,
  categoryLabel,
  statusLabel,
} from '@/lib/constants'

interface TicketsResponse {
  tickets: Ticket[]
}

interface TicketFilters {
  status?: TicketStatus
  category?: CategoryFilterValue
  search?: string
}

async function fetchTickets(sorting: SortingState, filters: TicketFilters) {
  const sort = sorting[0]
  const params: Record<string, string> = {
    sortBy: sort?.id ?? 'createdAt',
    sortDir: sort ? (sort.desc ? 'desc' : 'asc') : 'desc',
  }
  if (filters.status) params.status = filters.status
  if (filters.category) params.category = filters.category
  if (filters.search) params.search = filters.search

  const { data } = await axios.get<TicketsResponse>('/api/tickets', {
    params,
    withCredentials: true,
  })
  return data.tickets
}

function statusFilterLabel(value: StatusFilterValue) {
  return value === 'ALL' ? 'All statuses' : statusLabel(value)
}

function categoryFilterLabel(value: CategoryFilterValue) {
  if (value === 'ALL') return 'All categories'
  if (value === 'UNCATEGORIZED') return 'Uncategorized'
  return categoryLabel(value)
}

function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [status, setStatus] = useState<StatusFilterValue>('ALL')
  const [category, setCategory] = useState<CategoryFilterValue>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const filters: TicketFilters = {
    status: status === 'ALL' ? undefined : status,
    category: category === 'ALL' ? undefined : category,
    search: search || undefined,
  }

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['tickets', sorting, filters],
    queryFn: () => fetchTickets(sorting, filters),
  })

  const filterBar = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          type="search"
          placeholder="Search subject, sender..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="h-9 w-60 pl-8 text-[13px]"
        />
      </div>

      <Select value={status} onValueChange={(value) => setStatus(value as StatusFilterValue)}>
        <SelectTrigger className="w-[150px] text-[13px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {statusFilterLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={category}
        onValueChange={(value) => setCategory(value as CategoryFilterValue)}
      >
        <SelectTrigger className="w-[170px] text-[13px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {categoryFilterLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tickets.length > 0 && (
        <span className="ml-auto text-[13px] text-zinc-500">
          {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )

  return (
    <main className="flex flex-col items-center p-8 text-left">
      <div className="w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900">Tickets</h1>
        </div>

        {filterBar}

        {isLoading ? (
          <TicketsTableSkeleton />
        ) : error ? (
          <p className="text-[13px] text-destructive">Failed to load tickets</p>
        ) : (
          <TicketsTable tickets={tickets} sorting={sorting} onSortingChange={setSorting} />
        )}
      </div>
    </main>
  )
}

export default Tickets