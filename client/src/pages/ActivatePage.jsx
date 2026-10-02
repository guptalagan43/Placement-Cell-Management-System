import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  requestActivation as requestActivationApi,
  activate as activateApi,
} from '../api/auth.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'

const SKIT_PATTERN = /^[^\s@]+@skit\.ac\.in$/i

// New student account activation — two steps:
//   Step 1 — Enter @skit.ac.in email → server emails a temporary password
//   Step 2 — Enter email + temporary password + choose a new password → account live
//   → Redirect to sign-in page to log in normally
export default function ActivatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // ── Step 1 form ───────────────────────────────────────────────────────────
  const {
    register: reg1,
    handleSubmit: hs1,
    getValues: gv1,
    formState: { errors: e1, isSubmitting: s1 },
  } = useForm()

  const onRequestActivation = async (data) => {
    setError('')
    try {
      await requestActivationApi(data.email)
      setSubmittedEmail(data.email)
      setStep(2)
    } catch (err) {
      setError(err.message ?? 'Request failed. Please try again.')
    }
  }

  // ── Step 2 form ───────────────────────────────────────────────────────────
  const {
    register: reg2,
    handleSubmit: hs2,
    watch: w2,
    formState: { errors: e2, isSubmitting: s2 },
  } = useForm({ defaultValues: { email: submittedEmail } })

  const newPw = w2('newPassword')

  const onActivate = async (data) => {
    setError('')
    try {
      await activateApi(data.email, data.tempPassword, data.newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login', {
        state: { message: 'Account activated! Please sign in with your new password.' },
      }), 1800)
    } catch (err) {
      setError(err.message ?? 'Activation failed. Please check your details and try again.')
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
        <Card className="w-full max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-bg mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Account Activated!</h1>
          <p className="font-body text-sm text-ink-600">
            Your PCMS account is ready. Redirecting you to sign-in…
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-700 border-t-transparent" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-50 mb-4">
            <span className="text-2xl">🆕</span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900">
            Activate Your Account
          </h1>
          <p className="mt-2 font-body text-sm text-ink-600">
            {step === 1
              ? 'New to PCMS? Enter your college email to receive a temporary password.'
              : 'Check your college inbox for the temporary password, then choose a new one.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['Request Access', 'Set Password'].map((label, i) => {
            const s = i + 1
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors
                  ${step > s ? 'bg-success text-white' : step === s ? 'bg-primary-700 text-white' : 'bg-border text-ink-500'}`}>
                  {step > s ? '✓' : s}
                </div>
                <span className={`font-body text-xs ${step >= s ? 'text-ink-700' : 'text-ink-400'}`}>{label}</span>
                {s < 2 && <div className="flex-1 h-px bg-border" />}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mb-5 rounded-md bg-danger-bg p-3 text-sm font-body text-danger" role="alert">
            {error}
          </div>
        )}

        {/* ── Step 1: Request temp password ──────────────────────────────── */}
        {step === 1 && (
          <>
            <form onSubmit={hs1(onRequestActivation)} className="space-y-4">
              <Input
                id="act-email"
                label="College Email"
                type="email"
                placeholder="b241218@skit.ac.in"
                autoComplete="email"
                error={e1.email?.message}
                helperText="Your account must be pre-registered by the T&P Cell"
                {...reg1('email', {
                  required: 'College email is required',
                  pattern: { value: SKIT_PATTERN, message: 'Must be a valid @skit.ac.in address' },
                })}
              />

              <Button type="submit" variant="primary" fullWidth disabled={s1}>
                {s1 ? 'Sending temporary password…' : 'Send Temporary Password'}
              </Button>
            </form>

            <div className="mt-4 rounded-lg bg-primary-50 border border-primary-100 p-3">
              <p className="font-body text-xs text-primary-800">
                <strong>Note:</strong> Your account must be created by the T&amp;P Cell before you can activate it.
                If you haven't received an email within a few minutes, contact your coordinator.
              </p>
            </div>
          </>
        )}

        {/* ── Step 2: Enter temp password + set new password ─────────────── */}
        {step === 2 && (
          <>
            <div className="mb-4 rounded-lg bg-success-bg border border-success/20 p-3">
              <p className="font-body text-xs text-success-text">
                ✉️ A temporary password has been sent to <strong>{submittedEmail}</strong>.
                Check your inbox (and spam folder).
              </p>
            </div>

            <form onSubmit={hs2(onActivate)} className="space-y-4">
              <Input
                id="act-email2"
                label="College Email"
                type="email"
                autoComplete="email"
                error={e2.email?.message}
                defaultValue={submittedEmail}
                {...reg2('email', {
                  required: 'Email is required',
                  pattern: { value: SKIT_PATTERN, message: 'Must be a valid @skit.ac.in address' },
                })}
              />

              <Input
                id="act-temppw"
                label="Temporary Password"
                type="password"
                placeholder="From the email we sent"
                autoComplete="current-password"
                error={e2.tempPassword?.message}
                {...reg2('tempPassword', { required: 'Temporary password is required' })}
              />

              <Input
                id="act-newpw"
                label="New Password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={e2.newPassword?.message}
                {...reg2('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />

              <Input
                id="act-confirmpw"
                label="Confirm New Password"
                type="password"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                error={e2.confirmPassword?.message}
                {...reg2('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === newPw || 'Passwords do not match',
                })}
              />

              <Button type="submit" variant="primary" fullWidth disabled={s2} className="mt-2">
                {s2 ? 'Activating…' : 'Activate Account'}
              </Button>
            </form>

            <p className="mt-3 text-center font-body text-xs text-ink-500">
              Wrong email?{' '}
              <button type="button" onClick={() => { setStep(1); setError('') }}
                className="text-primary-700 hover:underline font-semibold">
                Go back
              </button>
            </p>
          </>
        )}

        <p className="mt-6 text-center font-body text-xs text-ink-500">
          Already have an account?{' '}
          <a href="/login" className="text-primary-700 hover:underline font-semibold">Sign In</a>
        </p>
      </Card>
    </div>
  )
}
