import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Button } from '@/components/ui/button'
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

async function deleteUser(id: string) {
  const { data } = await axios.delete<{ user: User }>(`/api/users/${id}`, {
    withCredentials: true,
  })
  return data.user
}

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => deleteUser(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      setError('')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Failed to delete user')
      } else {
        setError('Failed to delete user')
      }
    },
  })

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">{user?.name}</span>?{' '}
            {user?.email} will no longer be able to sign in. This action can be
            undone by an administrator.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteUserDialog