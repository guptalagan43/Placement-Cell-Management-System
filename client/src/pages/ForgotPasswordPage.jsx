import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  forgotPassword as forgotPasswordApi,
  verifyForgotOtp,
  resetPassword as resetPasswordApi,
} from '../api/auth.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'

const SKIT_PATTERN = /^[^\s@]+@skit\.ac\.in$/i

const STEPS = ['Email', 'Verify OTP', 'New Password']

// Three-step forgot-password flow:
//   Step 1 — Enter @skit.ac.in email → OTP sent to inbox
//   Step 2 — Enter 6-digit OTP → server returns a short-lived reset token
//   Step 3 — Enter + confirm new password → redirect to sign-in
export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState('')

  // ── OTP boxes ─────────────────────────────────────────────────────────────
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
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus()
  }
  function handleOtpPaste(e) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    const next = [...otp]
    digits.forEach((d, i) => { next[i] = d })
    setOtp(next)
    if (digits.length > 0) otpRefs[Math.min(digits.length, 5)].current?.focus()
  }

  // ── Step 1 form ───────────────────────────────────────────────────────────
  const {
    register: reg1,
    handleSubmit: hs1,
    formState: { errors: e1, isSubmitting: s1 },
  } = useForm()

  const onEmail = async (data) => {
    setError('')
    try {
      await forgotPasswordApi(data.email)
      setEmail(data.email)
      setStep(2)
      setTimeout(() => otpRefs[0].current?.focus(), 100)
    } catch (err) {
      setError(err.message ?? 'Failed to send reset code.')
    }
  }

  // ── Step 2: OTP verify ────────────────────────────────────────────────────
  const [verifying, setVerifying] = useState(false)

  const onVerifyOtp = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setError('Enter the full 6-digit code.'); return }
    setError('')
    setVerifying(true)
    try {
      const data = await verifyForgotOtp(email, code)
      setResetToken(data.resetToken)
      setStep(3)
    } catch (err) {
      setError(err.message ?? 'Incorrect or expired OTP.')
    } finally {
      setVerifying(false)
    }
  }

  // ── Step 3 form ───────────────────────────────────────────────────────────
  const {
    register: reg3,
    handleSubmit: hs3,
    watch: w3,
    formState: { errors: e3, isSubmitting: s3 },
  } = useForm()
  const newPw = w3('password')

  const onReset = async (data) => {
    setError('')
    try {
      await resetPasswordApi(resetToken, data.password)
      navigate('/login', {
        state: { message: 'Password reset! Please sign in with your new password.' },
      })
    } catch (err) {
      setError(err.message ?? 'Failed to reset password. Please start again.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const stepLabels = ['Email', 'Verify OTP', 'New Password']

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-warning-bg mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900">
            Reset Password
          </h1>
          <p className="mt-2 font-body text-sm text-ink-600">
            {step === 1 && 'Enter your college email to receive a reset code'}
            {step === 2 && `Enter the 6-digit code sent to ${email}`}
            {step === 3 && 'Choose a strong new password'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-6">
          {stepLabels.map((label, i) => {
            const s = i + 1
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors
                    ${step > s ? 'bg-success text-white' : step === s ? 'bg-primary-700 text-white' : 'bg-border text-ink-500'}`}>
                    {step > s ? '✓' : s}
                  </div>
                  <span className={`font-body text-xs whitespace-nowrap ${step >= s ? 'text-ink-700' : 'text-ink-400'}`}>
                    {label}
                  </span>
                </div>
                {s < 3 && <div className="flex-1 h-px bg-border mx-2" />}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mb-5 rounded-md bg-danger-bg p-3 text-sm font-body text-danger" role="alert">
            {error}
          </div>
        )}

        {/* ── Step 1: Email ─────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={hs1(onEmail)} className="space-y-4">
            <Input
              id="fp-email"
              label="College Email"
              type="email"
              placeholder="b241218@skit.ac.in"
              autoComplete="email"
              error={e1.email?.message}
              {...reg1('email', {
                required: 'College email is required',
                pattern: { value: SKIT_PATTERN, message: 'Must be a valid @skit.ac.in address' },
              })}
            />
            <Button type="submit" variant="primary" fullWidth disabled={s1}>
              {s1 ? 'Sending code…' : 'Send Reset Code'}
            </Button>
          </form>
        )}

        {/* ── Step 2: OTP ───────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={onVerifyOtp} className="space-y-6">
            <div>
              <label className="block font-body text-sm font-semibold text-ink-900 mb-3 text-center">
                6-digit reset code
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
                      focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20 transition-colors
                      ${digit ? 'border-warning' : 'border-border'}`}
                    aria-label={`Reset code digit ${idx + 1}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-center font-body text-xs text-ink-500">
                Check your inbox and spam folder · expires in 10 minutes
              </p>
            </div>
            <Button type="submit" variant="primary" fullWidth disabled={verifying}>
              {verifying ? 'Verifying…' : 'Verify Code'}
            </Button>
            <p className="text-center font-body text-xs text-ink-500">
              Wrong email?{' '}
              <button type="button" onClick={() => { setStep(1); setError('') }}
                className="text-primary-700 hover:underline font-semibold">
                Go back
              </button>
            </p>
          </form>
        )}

        {/* ── Step 3: New password ──────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={hs3(onReset)} className="space-y-4">
            <Input
              id="fp-newpw"
              label="New Password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              error={e3.password?.message}
              {...reg3('password', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <Input
              id="fp-confirmpw"
              label="Confirm New Password"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={e3.confirmPassword?.message}
              {...reg3('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === newPw || 'Passwords do not match',
              })}
            />
            <Button type="submit" variant="primary" fullWidth disabled={s3} className="mt-2">
              {s3 ? 'Saving…' : 'Set New Password'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center font-body text-xs text-ink-500">
          Remember your password?{' '}
          <a href="/login" className="text-primary-700 hover:underline font-semibold">Sign In</a>
        </p>
      </Card>
    </div>
  )
}
