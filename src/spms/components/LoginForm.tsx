import { useState } from 'react'

type LoginFormProps = {
  onSubmit: (identifier: string, password: string) => Promise<void>
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!identifier.trim() || !password) {
      setError('Please enter email/username and password.')
      return
    }
    setLoading(true)
    try {
      await onSubmit(identifier.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
      <div>
        <label className="form-label fw-semibold">Email or Username</label>
        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-person" />
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. registrar@spms.edu"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            disabled={loading}
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className="form-label fw-semibold">Password</label>
        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-lock" />
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            className="form-control"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger py-2 mb-0" role="alert">
          <i className="bi bi-exclamation-circle me-2" />
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary rounded-4 py-2 fw-semibold"
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            Signing in...
          </>
        ) : (
          <>
            <i className="bi bi-box-arrow-in-right me-2" />
            Login
          </>
        )}
      </button>
    </form>
  )
}
