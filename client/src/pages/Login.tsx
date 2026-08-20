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
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <h1>Helpdesk</h1>
        <p className="login-subtitle">Sign in to your account</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={errors.email ? true : undefined}
            {...register('email')}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p className="field-error">{errors.password.message}</p>
          )}
        </label>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

export default Login