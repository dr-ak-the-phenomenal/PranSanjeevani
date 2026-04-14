// Placeholder screens — Phase 4 and beyond
// PrescriptionScreen + PrescriptionViewScreen — built in Phase 3 ✅

import React from 'react';

function PlaceholderScreen({ icon, title, subtitle, phase }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        padding: '20px 20px',
        color: 'white',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{title}</h1>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '64px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--navy)', marginBottom: 8 }}>
          {title}
        </h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>{subtitle}</p>
        <div style={{
          marginTop: 24, background: 'rgba(15,76,129,0.08)',
          borderRadius: 12, padding: '10px 20px',
          fontSize: 13, color: 'var(--navy)', fontWeight: 600,
        }}>Coming in {phase}</div>
      </div>
    </div>
  );
}

export function FinanceScreen() {
  return <PlaceholderScreen icon="💰" title="Finance"
    subtitle="Daily income dashboard, bKash vs cash breakdown, and payment history."
    phase="Phase 6" />;
}

export function BookingScreen() {
  return <PlaceholderScreen icon="📅" title="Book Appointment"
    subtitle="Patient-facing appointment booking with bKash payment verification."
    phase="Phase 6" />;
}
