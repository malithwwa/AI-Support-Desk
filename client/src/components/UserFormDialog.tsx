import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from '@helpdesk/core'
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

async function createUser(playload: CreateUserInput) {
  const { data } = await axios.post<{ user: User }>('/api/users', playload, {
    withCredentials: true,
  })
  return data.user
}

async function updateUser(id: string, playload: UpdateUserInput) {
  const { data } = await axios.patch<{ user: User }>(`/api/users/${id}`, playload, {
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

function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  user?: User | null
}) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const isEdit = Boolean(user)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(
      isEdit ? updateUserSchema : createUserSchema,
    ) as Resolver<CreateUserInput>,
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
      })
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id])

  const mutation = useMutation({
    mutationFn: (input: CreateUserInput) => {
      if (isEdit && user) {
        const payload: UpdateUserInput = { name: input.name, email: input.email }
        if (input.password) {
          payload.password = input.password
        }
        return updateUser(user.id, payload)
      }
      return createUser(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
      })
      setError('')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Failed to save user')
      } else {
        setError('Failed to save user')
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
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
      })
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit user' : 'Create user'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the user's details. Leave the password blank to keep it unchanged."
              : 'Add a new agent to the helpdesk.'}
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
            <Label htmlFor="password">
              {isEdit ? 'New password (optional)' : 'Password'}
            </Label>
            <AutofillBlockedInput
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              placeholder={isEdit ? 'Leave blank to keep current password' : ''}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UserFormDialog