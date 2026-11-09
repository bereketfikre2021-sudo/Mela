import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Input } from '../design-system/Input'
import { useNotification } from '../design-system/Notification'
import { GoogleIcon } from '../modules/auth/GoogleIcon'
import { mapAuthError, signInWithGoogle, signUp } from '../modules/auth/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Owner registration. On a returned session routes to /onboarding. */
export function RegisterPage() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { notify } = useNotification()

  const [formOpen,         setFormOpen]         = useState(false)
  const [email,            setEmail]            = useState('')
  const [password,         setPassword]         = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [showPw,           setShowPw]           = useState(false)
  const [showConfirmPw,    setShowConfirmPw]    = useState(false)
  const [errors,           setErrors]           = useState<Record<string, string>>({})
  const [submitting,       setSubmitting]       = useState(false)
  const [formError,        setFormError]        = useState('')

  function validateField(field: string, value: string, all?: { password?: string }): string {
    if (field === 'email')           return EMAIL_RE.test(value.trim()) ? '' : t('validation.email')
    if (field === 'password')        return value.length >= 8 ? '' : t('validation.passwordMin')
    if (field === 'confirmPassword') return value === (all?.password ?? password) ? '' : t('validation.passwordMatch')
    return ''
  }

  function handleBlur(field: string, value: string) {
    setErrors(prev => ({ ...prev, [field]: validateField(field, value) }))
  }

  async function handleGoogle() {
    const { error } = await signInWithGoogle()
    if (error) notify({ tone: 'danger', title: mapAuthError(t, error.message) })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      email:           validateField('email',           email),
      password:        validateField('password',        password),
      confirmPassword: validateField('confirmPassword', confirmPassword, { password }),
    }
    setErrors(next)
    setFormError('')
    if (Object.values(next).some(Boolean)) return

    setSubmitting(true)
    const { data, error } = await signUp(email.trim(), password)
    setSubmitting(false)

    if (error) {
      const msg = mapAuthError(t, error.message)
      setFormError(msg)
      notify({ tone: 'danger', title: msg })
      return
    }

    // If email confirmation is ON, Supabase returns no session — tell the user.
    if (!data?.session) {
      const msg = t('auth.errors.emailNotConfirmed')
      setFormError(msg)
      notify({ tone: 'info', title: msg })
      return
    }
    navigate('/onboarding')
  }

  return (
    <div className="mx-auto max-w-md py-6 md:py-10">
      <div className="rounded-lg border border-border bg-surface p-6 md:p-8 space-y-5">

        <h1 className="text-2xl font-bold text-text">{t('auth.register.title')}</h1>

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

        {/* ── Collapsible email + password form ── */}
        <div>
          <button
            type="button"
            onClick={() => setFormOpen(v => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-text hover:bg-background transition-colors"
            aria-expanded={formOpen}
          >
            <span>{t('auth.register.usePassword')}</span>
            <ChevronDown
              className={`h-4 w-4 text-secondary transition-transform duration-200 ${formOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {formOpen && (
            <form onSubmit={handleSubmit} className="mt-3 space-y-4" noValidate>
              {formError && (
                <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              )}

              <Input
                label={t('auth.register.email')}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={e => handleBlur('email', e.target.value)}
                error={errors.email}
                autoComplete="email"
              />

              <Input
                label={t('auth.register.password')}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={e => handleBlur('password', e.target.value)}
                error={errors.password}
                autoComplete="new-password"
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                    className="text-secondary hover:text-text"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <Input
                label={t('auth.register.confirmPassword')}
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onBlur={e => handleBlur('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(v => !v)}
                    aria-label={showConfirmPw ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                    className="text-secondary hover:text-text"
                  >
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <Button type="submit" size="lg" loading={submitting} fullWidth>
                {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
              </Button>
            </form>
          )}
        </div>

      </div>

      <p className="mt-4 text-center text-sm text-secondary">
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('auth.register.toLogin')}
        </Link>
      </p>
    </div>
  )
}
