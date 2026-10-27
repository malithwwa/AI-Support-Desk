import DOMPurify from 'isomorphic-dompurify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import TicketDetail from '@/components/TicketDetail'
import UpdateTicket from '@/components/UpdateTicket'
import { useSession } from '@/lib/auth-client'
import { senderTypeLabel } from '@/lib/constants'
import type { TicketDetail as TicketDetailData, TicketReply } from '@/lib/tickets'
import {
  createTicketReplySchema,
  type CreateTicketReplyInput,
} from '@helpdesk/core'

async function fetchTicket(id: number) {
  const { data } = await axios.get<{ ticket: TicketDetailData }>(`/api/tickets/${id}`, {
    withCredentials: true,
  })
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

function TicketDetailPage() {
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
              <TicketDetail ticket={ticket} showBadges={!isAdmin} />

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
                            {reply.user.name}
                          </span>
                          <span className="text-[13px] text-zinc-500">
                           {senderTypeLabel(reply.senderType)} ·{' '}
                            {formatDateTime(reply.createdAt)}
                          </span>
                          <p className="text-[13px] mt-5 wrap-break-word whitespace-pre-wrap text-zinc-900">
                            {DOMPurify.sanitize(reply.body, {
                              ALLOWED_TAGS: [],
                              ALLOWED_ATTR: [],
                              USE_PROFILES: { html: false },
                            })}
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

            {isAdmin && <UpdateTicket ticket={ticket} />}
          </div>
        )}
      </div>
    </main>
  )
}

export default TicketDetailPage
