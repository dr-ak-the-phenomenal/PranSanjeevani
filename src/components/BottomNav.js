import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  {
    path: '/dashboard',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#0f4c81' : 'none'} stroke={active ? '#0f4c81' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    label: 'Dashboard',
  },
  {
    path: '/patients',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#0f4c81' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    label: 'Patients',
  },
  {
    path: '/prescription/new',
    icon: (active) => (
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(15,76,129,0.4)',
        marginTop: -20,
        border: '3px solid white',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </div>
    ),
    label: '',
    isCenter: true,
  },
  {
    path: '/finance',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#0f4c81' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    label: 'Finance',
  },
  {
    path: '/settings',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#0f4c81' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    label: 'Settings',
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/prescription/new') return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      height: 'var(--bottom-nav-height)',
      zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
    }}>
      {tabs.map((tab, i) => {
        const active = isActive(tab.path);
        return (
          <button
            key={i}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tab.isCenter ? 0 : 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              minHeight: 44,
              paddingTop: tab.isCenter ? 0 : 8,
            }}
          >
            {tab.icon(active)}
            {tab.label && (
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-body)',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--navy)' : '#9ca3af',
                transition: 'color 0.2s',
              }}>
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
