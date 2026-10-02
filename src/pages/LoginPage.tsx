import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { registerApi } from '../api/auth.js';
import { AppHeader } from '../components/layout/AppHeader.js';
import { ErrorAlert } from '../components/common/ErrorAlert.js';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('patient.demo@manvia.health');
  const [password, setPassword] = useState('Str0ngP@ssw0rd!2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, setManualAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/wellness';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await registerApi({ email, password });
        await login({ email, password });
      } else {
        await login({ email, password });
      }
      navigate(redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      // If user not found during login, offer quick registration or fallback
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSession = () => {
    // Generates a mock patient session for development / smoke testing
    setManualAuth(
      {
        id: 'pat-demo-001',
        email: 'patient.demo@manvia.health',
        roles: ['PATIENT'],
        displayName: 'Demo Patient',
      },
      'demo-jwt-token-patient-phase5',
    );
    navigate(redirectUrl);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />

      <div className="wrap" style={{ padding: '60px 0', display: 'grid', placeItems: 'center' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.07)',
            padding: '40px',
            width: '100%',
            maxWidth: '460px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="eyebrow">PATIENT AUTHENTICATION</div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 6px', color: '#073a78' }}>
              {isRegister ? 'Create Patient Account' : 'Welcome to MANVIA'}
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Sign in to manage your wellness journey and care timeline.
            </p>
          </div>

          {error && <ErrorAlert title="Authentication Error" message={error} />}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="auth-email"
                style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#073a78', marginBottom: '6px' }}
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="auth-password"
                style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#073a78', marginBottom: '6px' }}
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                textAlign: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? 'Authenticating...'
                : isRegister
                  ? 'Register Patient Account →'
                  : 'Sign In to Wellness & Timeline →'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  style={{ border: 0, background: 'none', color: '#096ed3', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  style={{ border: 0, background: 'none', color: '#096ed3', fontWeight: 700, cursor: 'pointer' }}
                >
                  Register here
                </button>
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px dashed #cbd5e1',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
              Testing / Local Evaluation Mode:
            </div>
            <button
              type="button"
              onClick={handleQuickDemoSession}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '12px',
                border: '1px solid #bae6fd',
                background: '#f0f9ff',
                color: '#0284c7',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡ Enter as Demo Patient (Direct Smoke Test)
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/" style={{ fontSize: '12px', color: '#64748b' }}>
              ← Return to Home Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
