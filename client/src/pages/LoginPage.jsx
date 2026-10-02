import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext.jsx'
import { login as loginApi, verifyLoginOtp } from '../api/auth.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'

const SKIT_PATTERN = /^[^\s@]+@skit\.ac\.in$/i

// Two-step sign-in:
//   Step 1 — College email + password → server sends OTP to inbox
//   Step 2 — Enter the 6-digit OTP → tokens issued, redirect to dashboard
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithToken } = useAuth()
  const from = location.state?.from?.pathname ?? '/'
  const successMessage = location.state?.message ?? ''

  const [step, setStep] = useState(1)            // 1 = credentials, 2 = OTP
  const [email, setEmail] = useState('')         // carried from step 1 → 2
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  // ── OTP input: 6 individual digit boxes ──────────────────────────────────
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  function handleOtpChange(idx, value) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    if (digit && idx < 5) otpRefs[idx + 1].current?.focus()
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus()
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    const next = [...otp]
    digits.forEach((d, i) => { next[i] = d })
    setOtp(next)
    if (digits.length > 0) otpRefs[Math.min(digits.length, 5)].current?.focus()
  }

  // ── Step 1: credentials form ──────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  const onCredentials = async (data) => {
    setError('')
    try {
      await loginApi(data.email, data.password)
      setEmail(data.email)
      setStep(2)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs[0].current?.focus(), 100)
    } catch (err) {
      setError(err.message ?? 'Sign-in failed. Please try again.')
    }
  }

  // ── Step 2: OTP verification ──────────────────────────────────────────────
  const [verifying, setVerifying] = useState(false)

  const onVerifyOtp = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setError('Enter the full 6-digit code.'); return }
    setError('')
    setVerifying(true)
    try {
      const data = await verifyLoginOtp(email, code)
      loginWithToken(data.accessToken, data.user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message ?? 'Incorrect or expired OTP.')
      setVerifying(false)
    }
  }

  const onResend = async () => {
    setResending(true)
    setResent(false)
    setError('')
    try {
      // Re-submit credentials (server re-issues OTP; password is from form state)
      // For UX simplicity we ask user to go back to step 1 to resend
      setStep(1)
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">

        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-50 mb-4">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900">
            {step === 1 ? 'Sign In to PCMS' : 'Verify Your Identity'}
          </h1>
          <p className="mt-2 font-body text-sm text-ink-600">
            {step === 1
              ? 'Use your SKIT college email to sign in'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors
                ${step >= s ? 'bg-primary-700 text-white' : 'bg-border text-ink-500'}`}>
                {s}
              </div>
              <span className={`font-body text-xs transition-colors ${step >= s ? 'text-ink-700' : 'text-ink-400'}`}>
                {s === 1 ? 'Credentials' : 'Verification'}
              </span>
              {s < 2 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {successMessage && (
          <div className="mb-5 rounded-md bg-success-bg p-3 text-sm font-body text-success-text" role="status">
            ✅ {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-md bg-danger-bg p-3 text-sm font-body text-danger" role="alert">
            {error}
          </div>
        )}

        {/* ── Step 1: Email + Password ──────────────────────────────────── */}
        {step === 1 && (
          <>
            <form onSubmit={handleSubmit(onCredentials)} className="space-y-4">
              <Input
                id="login-email"
                label="College Email"
                type="email"
                placeholder="b241218@skit.ac.in"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email', {
                  required: 'College email is required',
                  pattern: {
                    value: SKIT_PATTERN,
                    message: 'Must be a valid @skit.ac.in address',
                  },
                })}
              />

              <Input
                id="login-password"
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password', { required: 'Password is required' })}
              />

              <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="mt-2">
                {isSubmitting ? 'Sending verification code…' : 'Continue'}
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-center">
              <p className="font-body text-xs text-ink-500">
                Forgot password?{' '}
                <a href="/forgot-password" className="text-primary-700 hover:underline font-semibold">
                  Reset via OTP
                </a>
              </p>
              <p className="font-body text-xs text-ink-500">
                New student?{' '}
                <a href="/activate" className="text-primary-700 hover:underline font-semibold">
                  Activate your account
                </a>
              </p>
            </div>
          </>
        )}

        {/* ── Step 2: OTP boxes ────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={onVerifyOtp} className="space-y-6">
            <div>
              <label className="block font-body text-sm font-semibold text-ink-900 mb-3 text-center">
                6-digit verification code
              </label>
              <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 bg-surface text-ink-900
                      focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20 transition-colors
                      ${digit ? 'border-primary-700' : 'border-border'}`}
                    aria-label={`OTP digit ${idx + 1}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-center font-body text-xs text-ink-500">
                Check your college inbox (and spam folder)
              </p>
            </div>

            <Button type="submit" variant="primary" fullWidth disabled={verifying}>
              {verifying ? 'Verifying…' : 'Verify & Sign In'}
            </Button>

            <p className="text-center font-body text-xs text-ink-500">
              Didn't receive it?{' '}
              <button
                type="button"
                disabled={resending}
                onClick={onResend}
                className="text-primary-700 hover:underline font-semibold disabled:opacity-50"
              >
                {resending ? 'Sending…' : 'Go back and resend'}
              </button>
            </p>
          </form>
        )}
      </Card>
    </div>
  )
}
