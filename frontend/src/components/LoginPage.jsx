import { useState } from 'react'
import { authService } from '../services/api'
import { useToast } from '../context/AppContext'

export default function LoginPage({ onLogin }) {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await authService.login(username, password)
      toast('Welcome back, ' + data.username + '!')
      onLogin()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-mark">
            <i className="ph ph-graduation-cap" />
          </div>
          <div>
            <h1>CTech SMRS</h1>
            <p>Please sign in to continue</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Default: <b>admin</b> / <b>admin123</b>
        </p>
      </div>
    </div>
  )
}
