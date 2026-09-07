import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { activate as activateApi } from '../api/auth.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'

// Activation page: bulk-imported student sets their initial password using token from email.
// On success, auto-logs in and redirects to dashboard.
export default function ActivatePage() {
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
      setError('Invalid or missing activation token. Please request a new activation link.')
    }
  }, [token])

  const onSubmit = async (formData) => {
    if (!token) return
    setError('')
    setStatus('submitting')
    try {
      await activateApi(token, formData.password)
      setStatus('success')
      // Auto-login handled by activate API returning tokens
      // Redirect to dashboard after brief delay
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err) {
      setError(err.message ?? 'Failed to activate account. Please try again.')
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
              Activate Account
            </h1>
          </div>
          <div
            className="mb-6 rounded-md bg-danger-bg p-3 text-sm font-body text-danger"
            role="alert"
          >
            Invalid or missing activation token. Please request a new activation link.
          </div>
          <div className="text-center">
            <a
              href="/forgot-password"
              className="font-body text-sm text-primary-700 hover:underline"
            >
              Request a new activation link
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
              Account Activated
            </h1>
          </div>
          <div
            className="mb-6 rounded-md bg-success-bg p-3 text-sm font-body text-success"
            role="status"
          >
            Account activated successfully. Redirecting to dashboard…
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
            Activate Account
          </h1>
          <p className="mt-2 font-body text-sm text-ink-600">
            Set your password to activate your PCMS account.
          </p>
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
            {isSubmitting ? 'Activating…' : 'Activate Account'}
          </Button>
        </form>

        <p className="mt-6 text-center font-body text-xs text-ink-500">
          Need help?{' '}
          <a href="/forgot-password" className="text-primary-700 hover:underline font-semibold">
            Request a new activation link
          </a>
        </p>
      </Card>
    </div>
  )
}
