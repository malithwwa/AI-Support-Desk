import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/lib/auth-client'
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  categoryLabel,
  senderTypeLabel,
  statusLabel,
  type TicketCategory,
  type TicketStatus,
} from '@/lib/constants'
import type {
  TicketAssignee,
  TicketDetail as TicketDetailData,
  TicketReply,
} from '@/lib/tickets'
import {
  createTicketReplySchema,
  type CreateTicketReplyInput,
  type UpdateTicketInput,
} from '@helpdesk/core'

const UNASSIGNED = 'UNASSIGNED'
const UNCATEGORIZED = 'UNCATEGORIZED'

interface AssignableUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'AGENT'
}

interface UsersResponse {
  users: AssignableUser[]
}

async function fetchTicket(id: number) {
  const { data } = await axios.get<{ ticket: TicketDetailData }>(`/api/tickets/${id}`, {
    withCredentials: true,
  })
  return data.ticket
}

async function fetchAgents() {
  const { data } = await axios.get<UsersResponse>('/api/users', {
    withCredentials: true,
  })
  return data.users.filter((user) => user.role === 'AGENT')
}

async function updateTicket(id: number, patch: UpdateTicketInput) {
  const { data } = await axios.patch<{ ticket: TicketDetailData }>(
    `/api/tickets/${id}`,
    patch,
    { withCredentials: true },
  )
  return data.ticket
}

async function createReply(id: number, input: CreateTicketReplyInput) {
  const { data } = await axios.post<{ reply: TicketReply }>(
    `/api/tickets/${id}/replies`,
    input,
    { withCredentials: true },
  )
  return data.reply
}

function assigneeTag(assignedTo: TicketAssignee | null) {
  if (!assignedTo) {
    return <Badge variant="ghost">Unassigned</Badge>
  }
  return <Badge variant="secondary">{assignedTo.name}</Badge>
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function TicketDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-7 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const ticketId = Number(id)
  const isValidId = Number.isInteger(ticketId) && ticketId > 0

  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isAdmin = session?.user.role === 'ADMIN'

  const { data: ticket, isLoading, error, isError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: isValidId,
  })

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    enabled: isAdmin,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: UpdateTicketInput) => updateTicket(ticketId, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated)
    },
  })

  const replyMutation = useMutation({
    mutationFn: (input: CreateTicketReplyInput) => createReply(ticketId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      reset({ body: '' })
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTicketReplyInput>({
    resolver: zodResolver(createTicketReplySchema) as Resolver<CreateTicketReplyInput>,
    defaultValues: {
      body: '',
    },
  })

  const updateError = updateMutation.isError
    ? isAxiosError(updateMutation.error)
      ? (updateMutation.error.response?.data?.error ?? 'Failed to update ticket')
      : 'Failed to update ticket'
    : null

  const replyError = replyMutation.isError
    ? isAxiosError(replyMutation.error)
      ? (replyMutation.error.response?.data?.error ?? 'Failed to post reply')
      : 'Failed to post reply'
    : null

  const notFound =
    isError && isAxiosError(error) && error.response?.status === 404

  return (
    <main className="flex flex-col items-center p-8 text-left">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <Link
          to="/tickets"
          className="flex w-fit items-center gap-1 text-[13px] text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft className="size-3.5" />
          Back to tickets
        </Link>

        {isLoading ? (
          <TicketDetailSkeleton />
        ) : notFound || (!isValidId && !isLoading) ? (
          <p className="text-[13px] text-destructive">Ticket not found</p>
        ) : error || !ticket ? (
          <p className="text-[13px] text-destructive">Failed to load ticket</p>
        ) : (
          <div
            className={
              isAdmin
                ? 'grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]'
                : 'flex flex-col gap-6'
            }
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-lg font-bold wrap-break-word text-zinc-900">
                  {ticket.subject}
                </h1>
                {!isAdmin && (
                  <div className="flex flex-wrap items-center gap-2">
                    {ticket.status === 'OPEN' ? (
                      <Badge className="bg-zinc-900 text-white hover:bg-zinc-800">
                        {statusLabel(ticket.status)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{statusLabel(ticket.status)}</Badge>
                    )}
                    {ticket.category ? (
                      <Badge variant="outline">{categoryLabel(ticket.category)}</Badge>
                    ) : (
                      <Badge variant="ghost">{categoryLabel(ticket.category)}</Badge>
                    )}
                    {assigneeTag(ticket.assignedTo)}
                  </div>
                )}
              </div>

              <dl className="flex flex-wrap gap-x-8 gap-y-1 text-[13px]">
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Received</dt>
                  <dd className="text-zinc-900">{formatDateTime(ticket.createdAt)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Last updated</dt>
                  <dd className="text-zinc-900">{formatDateTime(ticket.updatedAt)}</dd>
                </div>
              </dl>

              <Card>
                <CardContent className="flex flex-col gap-1">
                  <h2 className="text-sm font-bold text-zinc-900">Message</h2>
                  <p className="text-[13px] text-zinc-500">
                    From {' '}
                    <a href={`mailto:${ticket.senderEmail}`} className="link text-[13px] text-zinc-500">
                      {ticket.senderName}
                    </a>
                  </p>
                  <p className="text-[13px] wrap-break-word whitespace-pre-wrap text-zinc-900 mt-5">
                    {ticket.body}
                  </p>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-bold text-zinc-900">
                  Replies ({ticket.replies.length})
                </h2>
                {ticket.replies.length === 0 ? (
                  <p className="text-[13px] text-zinc-500">No replies yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {ticket.replies.map((reply) => (
                      <Card key={reply.id}>
                        <CardContent className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-zinc-900">
                            {reply.useremail}
                          </span>
                          <span className="text-[13px] text-zinc-500">
                            {senderTypeLabel(reply.senderType)} ·{' '}
                            {formatDateTime(reply.createdAt)}
                          </span>
                          <p className="text-[13px] mt-5 wrap-break-word whitespace-pre-wrap text-zinc-900">
                            {reply.body}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-bold text-zinc-900">Reply</h2>
                <form
                  className="flex flex-col gap-3"
                  onSubmit={handleSubmit((input) => replyMutation.mutate(input))}
                  noValidate
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="reply-body" className="text-[13px] text-zinc-500">
                      Message
                    </Label>
                    <Textarea
                      id="reply-body"
                      rows={5}
                      placeholder="Write a reply…"
                      aria-invalid={errors.body ? true : undefined}
                      {...register('body')}
                    />
                    {errors.body && (
                      <p className="text-[13px] text-destructive">{errors.body.message}</p>
                    )}
                    {replyError && (
                      <p className="text-[13px] text-destructive">{replyError}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={replyMutation.isPending}>
                      {replyMutation.isPending ? 'Sending…' : 'Send reply'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-col items-end gap-4">
                <div className="flex w-1/2 flex-col gap-1">
                  <span className="text-[13px] text-zinc-500">Status</span>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) =>
                      updateMutation.mutate({ status: value as TicketStatus })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger
                      className="w-full text-[13px]"
                      aria-label="Ticket status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="w-(--radix-select-trigger-width)"
                    >
                      {TICKET_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex w-1/2 flex-col gap-1">
                  <span className="text-[13px] text-zinc-500">Category</span>
                  <Select
                    value={ticket.category ?? UNCATEGORIZED}
                    onValueChange={(value) =>
                      updateMutation.mutate({
                        category:
                          value === UNCATEGORIZED ? null : (value as TicketCategory),
                      })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger
                      className="w-full text-[13px]"
                      aria-label="Ticket category"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="w-(--radix-select-trigger-width)"
                    >
                      <SelectItem value={UNCATEGORIZED}>
                        {categoryLabel(null)}
                      </SelectItem>
                      {TICKET_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {categoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex w-1/2 flex-col gap-1">
                  <span className="text-[13px] text-zinc-500">Assigned to</span>
                  <Select
                    value={ticket.assignedTo?.id ?? UNASSIGNED}
                    onValueChange={(value) =>
                      updateMutation.mutate({
                        assignedToId: value === UNASSIGNED ? null : value,
                      })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger
                      className="w-full text-[13px]"
                      aria-label="Assign ticket"
                    >
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="w-(--radix-select-trigger-width)"
                    >
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {(agents ?? []).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {updateError && (
                  <p className="text-[13px] text-destructive">{updateError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default TicketDetail
