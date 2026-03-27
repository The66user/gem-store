/**
 * 管理后台 — 登录页
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../services/api';

function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(username, password);
      navigate('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: 'var(--space-xl)',
          background: 'var(--color-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          <img src="/logo.png" alt="The66Shop" style={{ height: '48px', marginBottom: '8px' }} /> The66Shop 管理后台
        </h2>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' }}>
              用户名
            </label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' }}>
              密码
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="message message-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : '登 录'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginPage;
