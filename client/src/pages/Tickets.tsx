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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type { Ticket } from '@/lib/tickets'
import type { StatusFilterValue, CategoryFilterValue, TicketStatus } from '@/lib/constants'
import {
  CATEGORY_FILTERS,
  STATUS_FILTERS,
  categoryLabel,
  statusLabel,
} from '@/lib/constants'

const PAGE_SIZE = 10

interface TicketsResponse {
  tickets: Ticket[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface TicketFilters {
  status?: TicketStatus
  category?: CategoryFilterValue
  search?: string
}

async function fetchTickets(sorting: SortingState, filters: TicketFilters, page: number) {
  const sort = sorting[0]
  const params: Record<string, string> = {
    sortBy: sort?.id ?? 'createdAt',
    sortDir: sort ? (sort.desc ? 'desc' : 'asc') : 'desc',
    page: String(page),
    pageSize: String(PAGE_SIZE),
  }
  if (filters.status) params.status = filters.status
  if (filters.category) params.category = filters.category
  if (filters.search) params.search = filters.search

  const { data } = await axios.get<TicketsResponse>('/api/tickets', {
    params,
    withCredentials: true,
  })
  return data
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
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [sorting, status, category, search])

  const filters: TicketFilters = {
    status: status === 'ALL' ? undefined : status,
    category: category === 'ALL' ? undefined : category,
    search: search || undefined,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', sorting, filters, page],
    queryFn: () => fetchTickets(sorting, filters, page),
  })

  const tickets = data?.tickets ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

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
        <SelectTrigger className="w-37.5 text-[13px]">
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
        <SelectTrigger className="w-42.5 text-[13px]">
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

      {total > 0 && (
        <span className="ml-auto text-[13px] text-zinc-500">
          {total} ticket{total === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )

  const pageNumbers: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  const pageList = pageNumbers
    .filter(
      (p) =>
        p === 1 || p === totalPages || Math.abs(p - page) <= 1,
    )
    .reduce<(number | `ellipsis-${number}`)[]>((acc, p) => {
      const prev = acc[acc.length - 1]
      if (typeof prev === 'number' && p - prev > 1) {
        acc.push(`ellipsis-${p - 1}`)
      }
      acc.push(p)
      return acc
    }, [])

  const paginationBar = totalPages > 1 && (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (page > 1) setPage(page - 1)
            }}
            className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>

        {pageList.map((p) =>
          typeof p === 'string' ? (
            <PaginationItem key={p}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  setPage(p)
                }}
                isActive={p === page}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (page < totalPages) setPage(page + 1)
            }}
            className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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
          <>
            <TicketsTable tickets={tickets} sorting={sorting} onSortingChange={setSorting} />
            {paginationBar}
          </>
        )}
      </div>
    </main>
  )
}

export default Tickets