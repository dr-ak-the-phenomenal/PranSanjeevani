import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter email and password');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message?.includes('password') ? 'Incorrect password' : 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (!err.message?.includes('popup-closed')) {
        toast.error('Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(160deg, #0a3460 0%, #0f4c81 40%, #1a6bb5 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -80,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }}/>
      <div style={{
        position: 'absolute',
        bottom: -60,
        left: -60,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'rgba(201,168,76,0.08)',
      }}/>

      {/* Logo area */}
      <div style={{ textAlign: 'center', marginBottom: 40, animation: 'fadeIn 0.6s ease' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{ fontSize: 32 }}>⚕️</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 700,
          color: 'white',
          letterSpacing: '-0.5px',
          marginBottom: 6,
        }}>
          Pran Sanjeevani
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 14,
          fontWeight: 400,
        }}>
          AI-Powered Medical Assistant
        </p>
      </div>

      {/* Login card */}
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '28px 24px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.5s ease 0.1s both',
      }}>
        <h2 style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--gray-800)',
          marginBottom: 20,
          fontFamily: 'var(--font-display)',
        }}>
          Doctor Login
        </h2>

        <form onSubmit={handleEmailLogin}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="drakthephenomenal@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 20 }}>
            <label className="input-label">Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
          >
            {loading ? <span className="spinner"/> : 'Sign In'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '16px 0',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }}/>
          <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }}/>
        </div>

        <button
          className="btn btn-secondary btn-full"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{ gap: 10 }}
        >
          {googleLoading ? (
            <span className="spinner spinner-navy"/>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--gray-400)',
          marginTop: 16,
          lineHeight: 1.4,
        }}>
          Access restricted to authorized doctor only
        </p>
      </div>

      {/* Book appointment link */}
      <p style={{
        marginTop: 24,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
      }}>
        Patient?{' '}
        <a
          href="/book"
          style={{ color: 'var(--gold-light)', fontWeight: 600, textDecoration: 'none' }}
        >
          Book an appointment →
        </a>
      </p>
    </div>
  );
}
