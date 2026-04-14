import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function AccessDeniedScreen() {
  const { logout, user } = useAuth();
  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(160deg, #0a3460, #0f4c81)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
      color: 'white',
    }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🚫</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 10 }}>
        Access Denied
      </h1>
      <p style={{ opacity: 0.7, fontSize: 15, lineHeight: 1.6, maxWidth: 300, marginBottom: 8 }}>
        This application is restricted to the authorized doctor only.
      </p>
      {user && (
        <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 28 }}>
          Logged in as: {user.email}
        </p>
      )}
      <button
        onClick={logout}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 10,
          padding: '12px 28px',
          color: 'white',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
