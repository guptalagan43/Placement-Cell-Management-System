import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { resetPassword as resetPasswordApi } from '../api/auth.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'

// Reset password page: user enters new password using token from URL.
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  const password = watch('password')
  const _confirmPassword = watch('confirmPassword')

  // Validate token presence on mount
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Invalid or missing reset token. Please request a new reset link.')
    }
  }, [token])

  const onSubmit = async (data) => {
    if (!token) return
    setError('')
    setStatus('submitting')
    try {
      await resetPasswordApi(token, data.password)
      setStatus('success')
    } catch (err) {
      setError(err.message ?? 'Failed to reset password. Please try again.')
      setStatus('error')
    }
  }

  // If token is missing, show error state
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900">
              Reset Password
            </h1>
          </div>
          <div
            className="mb-6 rounded-md bg-danger-bg p-3 text-sm font-body text-danger"
            role="alert"
          >
            Invalid or missing reset token. Please request a new reset link.
          </div>
          <div className="text-center">
            <a
              href="/forgot-password"
              className="font-body text-sm text-primary-700 hover:underline"
            >
              Request a new reset link
            </a>
          </div>
        </Card>
      </div>
    )
  }

  // If already successful, show success message
  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900">
              Password Reset
            </h1>
          </div>
          <div
            className="mb-6 rounded-md bg-success-bg p-3 text-sm font-body text-success"
            role="status"
          >
            Password has been reset. You can now log in with your new password.
          </div>
          <div className="text-center">
            <Button variant="primary" onClick={() => navigate('/login', { replace: true })}>
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900">
            Reset Password
          </h1>
          <p className="mt-2 font-body text-sm text-ink-600">Enter your new password below.</p>
        </div>

        {error && (
          <div
            className="mb-6 rounded-md bg-danger-bg p-3 text-sm font-body text-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === password || 'Passwords do not match',
            })}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
            className="mt-4"
          >
            {isSubmitting ? 'Resetting…' : 'Reset Password'}
          </Button>
        </form>

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
