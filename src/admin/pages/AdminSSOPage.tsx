/**
 * AdminSSOPage — SSO initiation route at /admin/sso.
 *
 * Automatically triggers the Central Admin OIDC flow on mount.
 * Shows a loading state while redirecting and surfaces any error clearly.
 * Preserves the fallback link back to /admin/login.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../lib/AdminAuthContext'

export function AdminSSOPage() {
  const { signInWithSSO }     = useAdminAuth()
  const navigate              = useNavigate()
  const [error, setError]     = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    // Guard against React Strict Mode double-invoke
    if (started) return
    setStarted(true)

    void (async () => {
      const { error: ssoError } = await signInWithSSO()
      if (ssoError) {
        // Surface the actual error — never hide it
        setError(ssoError)
      }
      // On success the browser is redirected by Supabase; nothing more to do here.
    })()
  }, [signInWithSSO, started])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6"
      style={{ backgroundColor: '#123D35', fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
        <img src="/Logo.svg" alt="MELA" className="mx-auto mb-4 h-14 w-14" />
        <h1 className="text-xl font-bold" style={{ color: '#123D35' }}>
          Signing in via Central Admin
        </h1>

        {!error ? (
          <>
            <p className="mt-2 text-sm text-gray-500">
              Redirecting to <strong>bk.pro.et</strong>…
            </p>
            {/* Simple animated dots indicator */}
            <div className="mt-6 flex items-center justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: '#1C6B53',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <style>{`@keyframes pulse { 0%,80%,100%{opacity:.2}40%{opacity:1} }`}</style>
          </>
        ) : (
          <>
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-left text-sm text-red-700">
              <p className="font-semibold">SSO error</p>
              <p className="mt-1 font-mono text-xs break-all">{error}</p>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              This usually means the <code>custom:central-admin</code> provider is not
              yet configured in Supabase, or the issuer URL is unreachable.
            </p>
          </>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  )
}
