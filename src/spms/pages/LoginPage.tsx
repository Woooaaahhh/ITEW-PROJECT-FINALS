import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultDashboardPath } from '../auth/authService'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (identifier: string, password: string) => {
    const user = await login(identifier, password)
    const path = getDefaultDashboardPath(user.role)
    navigate(path, { replace: true })
  }

  return (
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
          <LoginForm onSubmit={handleSubmit} />

          <div className="mt-4 pt-3 border-top text-center">
            <p className="spms-muted small mb-0">
              Demo: registrar@spms.edu / reg123 · faculty@spms.edu / faculty123 · student@spms.edu / student123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
