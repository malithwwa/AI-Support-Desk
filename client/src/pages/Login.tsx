import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router'
import { signIn, useSession } from '../lib/auth-client'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

function Login() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (isPending) return null
  if (session) return <Navigate to="/" replace />

  async function onSubmit(data: LoginForm) {
    setError('')
    const res = await signIn.email(data)
    if (res.error) {
      setError(res.error.message ?? 'Sign in failed')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        className="flex w-full max-w-[340px] flex-col gap-3 rounded-[10px] border border-zinc-200 bg-white p-6 text-left text-[13px] shadow-lg"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <h1 className="m-0 text-2xl font-bold text-zinc-900">Helpdesk</h1>
        <p className="mb-2 m-0 text-[13px] text-gray-500">
          Sign in to your account
        </p>

        <label className="flex flex-col gap-1 text-[13px]">
          <span className="text-gray-800">Email</span>
          <input
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none transition focus:border-blue-600 focus:outline-2 focus:outline-blue-600 focus:-outline-offset-1 aria-[invalid=true]:border-red-500"
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={errors.email ? true : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p className="m-0 text-xs text-red-500">{errors.email.message}</p>
          )}
        </label>

        <label className="flex flex-col gap-1 text-[13px]">
          <span className="text-gray-800">Password</span>
          <input
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none transition focus:border-blue-600 focus:outline-2 focus:outline-blue-600 focus:-outline-offset-1 aria-[invalid=true]:border-red-500"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p className="m-0 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </label>

        {error && (
          <p className="m-0 rounded-md bg-red-500/10 px-2.5 py-1.5 text-[13px] text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

export default Login