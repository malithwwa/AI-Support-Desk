import { useState } from 'react'
import type { ComponentProps } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, type CreateUserInput } from '@helpdesk/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

async function createUser(input: CreateUserInput) {
  const { data } = await axios.post<{ user: User }>('/api/users', input, {
    withCredentials: true,
  })
  return data.user
}

function AutofillBlockedInput(props: ComponentProps<typeof Input>) {
  return (
    <Input
      readOnly
      // Prevents Chrome from autofilling these fields: browser password
      // managers ignore autocomplete="off", so fields start read-only and
      // are unlocked on interaction (Chrome never autofills readonly inputs).
      onPointerDown={(e) => e.currentTarget.removeAttribute('readOnly')}
      onFocus={(e) => e.currentTarget.removeAttribute('readOnly')}
      {...props}
    />
  )
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      reset()
      setError('')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Failed to create user')
      } else {
        setError('Failed to create user')
      }
    },
  })

  function onSubmit(data: CreateUserInput) {
    setError('')
    mutation.mutate(data)
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      reset()
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Add a new agent to the helpdesk.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-user-form"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          autoComplete="off"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <AutofillBlockedInput
              id="name"
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <AutofillBlockedInput
              id="email"
              type="email"
              autoComplete="off"
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <AutofillBlockedInput
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateUserDialog