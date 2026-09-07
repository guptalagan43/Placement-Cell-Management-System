import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { forgotPassword as forgotPasswordApi } from '../api/auth.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'

// Forgot password page: user enters email to receive reset link.
export default function ForgotPasswordPage() {
  const [status, setStatus] = useState('idle') // idle | submitted | error
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (data) => {
    setError('')
    setStatus('submitted')
    try {
      await forgotPasswordApi(data.email)
      setStatus('submitted')
    } catch (err) {
      setError(err.message ?? 'Failed to send reset email. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900">
            Forgot Password
          </h1>
          <p className="mt-2 font-body text-sm text-ink-600">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {status === 'error' && (
          <div
            className="mb-6 rounded-md bg-danger-bg p-3 text-sm font-body text-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        {status === 'submitted' && (
          <div
            className="mb-6 rounded-md bg-success-bg p-3 text-sm font-body text-success"
            role="status"
          >
            If the email exists, a password reset link has been sent.
          </div>
        )}

        {status !== 'submitted' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@skit.ac.in"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              className="mt-4"
            >
              {isSubmitting ? 'Sending…' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center font-body text-xs text-ink-500">
          Remember your password?{' '}
          <a href="/login" className="text-primary-700 hover:underline font-semibold">
            Sign In
          </a>
        </p>
      </Card>
    </div>
  )
}
