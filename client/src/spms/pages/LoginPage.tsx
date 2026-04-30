/** Client-side routing (React Router): post-login redirect via useNavigate (no full page reload). */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultDashboardPath } from '../auth/authService'
import { LoginForm } from '../components/LoginForm'
import { ThreeDLoader } from '../components/ThreeDLoader'

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
                      <ThreeDLoader size={28} label="Redirecting" />
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
        <div className="spms-login-shell">
          <section className="spms-login-hero">
            <div className="spms-login-hero-inner">
              <img src="/header.png" alt="University of Cabuyao" className="img-fluid spms-login-hero-header mb-4" />
              <p className="spms-login-eyebrow mb-1">Welcome to</p>
              <h1 className="spms-login-brand mb-1">SPMS</h1>
              <h2 className="spms-login-subtitle mb-3">Student Profiling Management System</h2>
              <div className="spms-login-divider mb-3" />
            </div>
          </section>

          <section className="spms-login-auth-pane">
            <div className="spms-login-card card">
              <div className="card-body">
              <div className="text-center mb-4">
                <div className="spms-login-lock-icon mx-auto mb-3"><i className="bi bi-lock-fill" /></div>
                <p className="spms-muted mb-0">Please sign in to continue</p>
              </div>

              <LoginForm
                onSubmit={handleSubmit}
                showInlineError={false}
                onError={(message) => setErrorModal({ open: true, message })}
              />

                <div className="spms-login-or my-3"><span>or</span></div>

                <div className="spms-login-help text-center">
                  <i className="bi bi-shield-lock me-2" />
                  Need help? Contact <span className="fw-semibold">System Administrator</span>
                </div>

                <div className="mt-4 pt-3 border-top text-center">
                  <p className="spms-muted small mb-0">
                    Demo Admin: admin@spms.edu / admin123
                    <br />
                    Faculty Account: faculty@spms.edu / faculty123
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
