import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultDashboardPath } from '../auth/authService'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [errorModal, setErrorModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: string; to: string }>({
    open: false,
    title: '',
    message: '',
    to: '/',
  })

  const handleSubmit = async (identifier: string, password: string) => {
    const user = await login(identifier, password)
    const path = getDefaultDashboardPath(user.role)
    setSuccessModal({
      open: true,
      title: 'Login successful',
      message: `Welcome, ${user.name}. Redirecting in 3 seconds…`,
      to: path,
    })
  }

  useEffect(() => {
    if (!successModal.open) return
    const t = window.setTimeout(() => {
      const to = successModal.to
      setSuccessModal({ open: false, title: '', message: '', to: '/' })
      navigate(to, { replace: true })
    }, 3000)
    return () => window.clearTimeout(t)
  }, [successModal.open, successModal.to, navigate])

  return (
    <>
      {errorModal.open && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Login failed</h5>
                  <button type="button" className="btn-close" onClick={() => setErrorModal({ open: false, message: '' })} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 40, height: 40, background: 'rgba(239, 68, 68, .12)', color: '#b91c1c' }}
                    >
                      <i className="bi bi-exclamation-circle fs-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="fw-semibold">Please check your credentials.</div>
                      <div className="spms-muted small">{errorModal.message}</div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-primary rounded-3" onClick={() => setErrorModal({ open: false, message: '' })}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setErrorModal({ open: false, message: '' })} />
        </>
      )}

      {successModal.open && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">{successModal.title}</h5>
                  <button type="button" className="btn-close" onClick={() => setSuccessModal({ open: false, title: '', message: '', to: '/' })} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 40, height: 40, background: 'rgba(37, 99, 235, .12)', color: 'var(--spms-primary)' }}
                    >
                      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="fw-semibold">You’re signed in.</div>
                      <div className="spms-muted small">{successModal.message}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setSuccessModal({ open: false, title: '', message: '', to: '/' })} />
        </>
      )}

      <div className="spms-login-page">
        <div className="spms-login-card card">
          <div className="card-body">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-4 mb-3"
                style={{
                  width: 56,
                  height: 56,
                  background: 'rgba(37, 99, 235, .15)',
                  border: '1px solid rgba(37, 99, 235, .25)',
                }}
              >
                <i className="bi bi-mortarboard-fill text-primary fs-4" />
              </div>
              <h4 className="fw-bold mb-1">Student Profiling</h4>
              <p className="spms-muted small mb-0">Management System</p>
            </div>

            <h5 className="fw-bold mb-3">Sign in</h5>
            <LoginForm
              onSubmit={handleSubmit}
              showInlineError={false}
              onError={(message) => setErrorModal({ open: true, message })}
            />

            <div className="mt-4 pt-3 border-top text-center">
              <p className="spms-muted small mb-0">
                Demo: registrar@spms.edu / reg123 · faculty@spms.edu / faculty123 · student@spms.edu / student123
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
