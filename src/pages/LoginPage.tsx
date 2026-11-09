import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Input } from '../design-system/Input'
import { useNotification } from '../design-system/Notification'
import { GoogleIcon } from '../modules/auth/GoogleIcon'
import { mapAuthError, sendMagicLink, signIn, signInWithGoogle } from '../modules/auth/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Login page — Phase 1, updated Phase 12.
 *
 * Layout:
 *  1. Google OAuth button (primary)
 *  2. Magic-link (email OTP) — enter email, click "Send link"
 *  3. Collapsible "Sign in with password" section (optional)
 *     - Email + password fields
 *     - Show/hide password toggle
 *     - "Forgot password?" → triggers magic-link for that email
 */
export function LoginPage() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { notify } = useNotification()

  // ── Magic link state ──────────────────────────────────────────────────────
  const [magicEmail,    setMagicEmail]    = useState('')
  const [magicError,    setMagicError]    = useState('')
  const [magicSending,  setMagicSending]  = useState(false)
  const [magicSent,     setMagicSent]     = useState(false)

  // ── Password section state ────────────────────────────────────────────────
  const [pwOpen,      setPwOpen]      = useState(false)
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError,   setFormError]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  // ── Google ────────────────────────────────────────────────────────────────
  async function handleGoogle() {
    const { error } = await signInWithGoogle()
    if (error) {
      const msg = mapAuthError(t, error.message)
      notify({ tone: 'danger', title: msg })
    }
  }

  // ── Magic link ────────────────────────────────────────────────────────────
  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(magicEmail.trim())) {
      setMagicError(t('validation.email'))
      return
    }
    setMagicError('')
    setMagicSending(true)
    const { error } = await sendMagicLink(magicEmail.trim())
    setMagicSending(false)
    if (error) {
      setMagicError(mapAuthError(t, error.message))
      return
    }
    setMagicSent(true)
  }

  // ── Forgot password (re-uses magic link) ─────────────────────────────────
  async function handleForgotPassword() {
    const target = email.trim() || magicEmail.trim()
    if (!EMAIL_RE.test(target)) {
      setFormError(t('auth.forgotPassword.enterEmailFirst'))
      return
    }
    setFormError('')
    setMagicSending(true)
    const { error } = await sendMagicLink(target)
    setMagicSending(false)
    if (error) {
      setFormError(mapAuthError(t, error.message))
      return
    }
    // Switch to magic-link sent state
    setMagicEmail(target)
    setMagicSent(true)
    setPwOpen(false)
    notify({ tone: 'success', title: t('auth.forgotPassword.sent') })
  }

  // ── Password sign-in ──────────────────────────────────────────────────────
  function validateField(field: string, value: string): string {
    if (field === 'email')    return EMAIL_RE.test(value.trim()) ? '' : t('validation.email')
    if (field === 'password') return value.length >= 8 ? '' : t('validation.passwordMin')
    return ''
  }

  function handleBlur(field: string, value: string) {
    setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) }))
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      email:    validateField('email',    email),
      password: validateField('password', password),
    }
    setFieldErrors(next)
    setFormError('')
    if (Object.values(next).some(Boolean)) return

    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (error) {
      const msg = mapAuthError(t, error.message)
      setFormError(msg)
      notify({ tone: 'danger', title: msg })
      return
    }
    navigate('/app')
  }

  return (
    <div className="mx-auto max-w-md py-6 md:py-10">
      <div className="rounded-lg border border-border bg-surface p-6 md:p-8 space-y-6">

        <h1 className="text-2xl font-bold text-text">{t('auth.login.title')}</h1>

        {/* ── Google ── */}
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          leadingIcon={<GoogleIcon />}
          onClick={handleGoogle}
          className="border border-border bg-surface hover:bg-background"
        >
          {t('auth.google')}
        </Button>

        <div className="flex items-center gap-3 text-xs text-secondary">
          <span className="h-px flex-1 bg-border" />
          <span>{t('auth.or')}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* ── Magic link ── */}
        {magicSent ? (
          <div className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
            <p className="font-medium">{t('auth.magicLink.sentTitle')}</p>
            <p className="mt-1 text-xs opacity-80">
              {t('auth.magicLink.sentDesc', { email: magicEmail })}
            </p>
            <button
              type="button"
              className="mt-2 text-xs underline underline-offset-2 hover:no-underline"
              onClick={() => { setMagicSent(false); setMagicEmail('') }}
            >
              {t('auth.magicLink.tryAnother')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3" noValidate>
            <Input
              label={t('auth.magicLink.label')}
              type="email"
              value={magicEmail}
              onChange={e => { setMagicEmail(e.target.value); setMagicError('') }}
              placeholder={t('auth.login.email')}
              error={magicError}
              autoComplete="email"
            />
            <Button type="submit" size="lg" fullWidth loading={magicSending}>
              {magicSending ? t('auth.magicLink.sending') : t('auth.magicLink.submit')}
            </Button>
          </form>
        )}

        <div className="flex items-center gap-3 text-xs text-secondary">
          <span className="h-px flex-1 bg-border" />
          <span>{t('auth.or')}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* ── Collapsible password section ── */}
        <div>
          <button
            type="button"
            onClick={() => setPwOpen(v => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-text hover:bg-background transition-colors"
            aria-expanded={pwOpen}
          >
            <span>{t('auth.login.usePassword')}</span>
            <ChevronDown
              className={`h-4 w-4 text-secondary transition-transform duration-200 ${pwOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {pwOpen && (
            <form
              onSubmit={handlePasswordSubmit}
              className="mt-3 flex flex-col gap-4"
              noValidate
            >
              {formError && (
                <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              )}

              <Input
                label={t('auth.login.email')}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={e => handleBlur('email', e.target.value)}
                error={fieldErrors.email}
                autoComplete="email"
              />

              <Input
                label={t('auth.login.password')}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={e => handleBlur('password', e.target.value)}
                error={fieldErrors.password}
                autoComplete="current-password"
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                    className="text-secondary hover:text-text"
                  >
                    {showPw
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye    className="h-4 w-4" />
                    }
                  </button>
                }
              />

              {/* Forgot password */}
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  disabled={magicSending}
                  className="text-xs text-primary hover:underline underline-offset-2 disabled:opacity-50"
                >
                  {t('auth.forgotPassword.link')}
                </button>
              </div>

              <Button type="submit" size="lg" loading={submitting} fullWidth>
                {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
              </Button>
            </form>
          )}
        </div>

      </div>

      <p className="mt-4 text-center text-sm text-secondary">
        <Link to="/register" className="font-medium text-primary hover:underline">
          {t('auth.login.toRegister')}
        </Link>
      </p>
    </div>
  )
}
