import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Input } from '../design-system/Input'
import { useNotification } from '../design-system/Notification'
import { GoogleIcon } from '../modules/auth/GoogleIcon'
import { mapAuthError, signIn, signInWithGoogle } from '../modules/auth/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Owner log-in. On success routes to /app (guards bounce to /onboarding if needed). */
export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notify } = useNotification()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function validateField(field: string, value: string): string {
    if (field === 'email') return EMAIL_RE.test(value.trim()) ? '' : t('validation.email')
    if (field === 'password') return value.length >= 8 ? '' : t('validation.passwordMin')
    return ''
  }

  function handleBlur(field: string, value: string) {
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
  }

  async function handleGoogle() {
    const { error } = await signInWithGoogle()
    if (error) {
      const message = mapAuthError(t, error.message)
      setFormError(message)
      notify({ tone: 'danger', title: message })
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      email: validateField('email', email),
      password: validateField('password', password)
    }
    setErrors(next)
    setFormError('')
    if (Object.values(next).some(Boolean)) return

    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (error) {
      const message = mapAuthError(t, error.message)
      setFormError(message)
      notify({ tone: 'danger', title: message })
      return
    }
    navigate('/app')
  }

  return (
    <div className="mx-auto max-w-md py-6 md:py-10">
      <div className="rounded-lg border border-border bg-surface p-6 md:p-8">
        <h1 className="heading text-2xl">{t('auth.login.title')}</h1>
        <div className="mt-6">
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
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-secondary">
          <span className="h-px flex-1 bg-border" />
          <span>{t('auth.or')}</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {formError && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <Input
            label={t('auth.login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => handleBlur('email', e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label={t('auth.login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={(e) => handleBlur('password', e.target.value)}
            error={errors.password}
            autoComplete="current-password"
          />
          <Button type="submit" size="lg" loading={submitting} fullWidth>
            {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-secondary">
        <Link to="/register" className="font-medium text-primary hover:underline">
          {t('auth.login.toRegister')}
        </Link>
      </p>
    </div>
  )
}
