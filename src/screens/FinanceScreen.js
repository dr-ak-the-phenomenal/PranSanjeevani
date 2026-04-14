import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../context/SettingsContext';
import {
  formatTaka, todayString, formatDate
} from '../utils/helpers';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const TABS = ['Today', 'This Week', 'This Month', 'All Time'];

export default function FinanceScreen() {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('Today');
  const [payments, setPayments] = useState([]);
  const [bookingPayments, setBookingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingBookings, setPendingBookings] = useState([]);

  const today = todayString();

  // Load queue payments
  useEffect(() => {
    const startDate = getStartDate(activeTab);
    const q = query(
      collection(db, 'queue'),
      where('date', '>=', startDate),
      where('date', '<=', today)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.paymentStatus === 'paid' || p.paymentStatus === 'cash');
      setPayments(items);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [activeTab, today]);

  // Load booking payments
  useEffect(() => {
    const startDate = getStartDate(activeTab);
    const q = query(
      collection(db, 'bookings'),
      where('date', '>=', startDate),
      where('date', '<=', today),
      where('status', '==', 'confirmed')
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookingPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeTab, today]);

  // Load pending bookings
  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function getStartDate(tab) {
    const now = new Date();
    if (tab === 'Today') return today;
    if (tab === 'This Week') return format(subDays(now, 6), 'yyyy-MM-dd');
    if (tab === 'This Month') return format(startOfMonth(now), 'yyyy-MM-dd');
    return '2020-01-01';
  }

  const allPaid = [
    ...payments.map(p => ({ ...p, source: 'walkin' })),
    ...bookingPayments.map(p => ({ ...p, source: 'booking' })),
  ];

  const totalIncome = allPaid.reduce((s, p) => s + (p.fee || p.amount || 0), 0);
  const bkashIncome = allPaid
    .filter(p => p.paymentStatus === 'paid' || p.paymentMethod === 'bkash')
    .reduce((s, p) => s + (p.fee || p.amount || 0), 0);
  const cashIncome = allPaid
    .filter(p => p.paymentStatus === 'cash' || p.paymentMethod === 'cash')
    .reduce((s, p) => s + (p.fee || p.amount || 0), 0);
  const patientCount = allPaid.length;

  // Daily breakdown for mini chart (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const label = format(subDays(new Date(), 6 - i), 'EEE');
    const amount = allPaid
      .filter(p => (p.date || '').startsWith(d))
      .reduce((s, p) => s + (p.fee || p.amount || 0), 0);
    return { d, label, amount };
  });
  const maxBar = Math.max(...last7.map(d => d.amount), 1);

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100, background: 'var(--off-white)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        padding: '20px 20px 24px',
        color: 'white',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Finance
        </h1>
        <p style={{ fontSize: 13, opacity: 0.8 }}>Income & payment records</p>

        {/* Total income hero */}
        <div style={{
          marginTop: 20,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: '16px 20px',
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Total Income ({activeTab})</p>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}>
            {formatTaka(totalIncome)}
          </p>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{patientCount} patients paid</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '16px 16px 0',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: activeTab === tab ? 'var(--navy)' : 'white',
              color: activeTab === tab ? 'white' : 'var(--gray-600)',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(15,76,129,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Split cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <StatCard
            icon="📱"
            label="bKash"
            value={formatTaka(bkashIncome)}
            color="#e8347a"
            bg="#fff0f6"
          />
          <StatCard
            icon="💵"
            label="Cash"
            value={formatTaka(cashIncome)}
            color="#059669"
            bg="#f0fdf4"
          />
        </div>

        {/* Pending bookings alert */}
        {pendingBookings.length > 0 && (
          <div style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#9a3412' }}>
                {pendingBookings.length} Pending bKash Payment{pendingBookings.length > 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: 12, color: '#c2410c' }}>Awaiting your verification</p>
            </div>
          </div>
        )}

        {/* 7-day mini chart (shown for Week/Month/All Time) */}
        {activeTab !== 'Today' && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Last 7 Days</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
              {last7.map(day => (
                <div key={day.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%',
                    height: Math.max(4, (day.amount / maxBar) * 48),
                    background: day.d === today
                      ? 'linear-gradient(135deg, #c9a84c, #e8c96e)'
                      : 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
                    borderRadius: 4,
                    transition: 'height 0.3s',
                  }}/>
                  <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment list */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            Payment Records
            {loading && <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>Loading…</span>}
          </p>

          {!loading && allPaid.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
              <p style={{ fontSize: 14 }}>No payments recorded</p>
            </div>
          )}

          {allPaid
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .map((p, i) => (
              <PaymentRow key={p.id} payment={p} index={i} />
            ))
          }
        </div>

        {/* Pending bookings detail */}
        {pendingBookings.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🕐 Pending Verifications</p>
            {pendingBookings.map(b => (
              <PendingBookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="card" style={{ background: bg, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontWeight: 800, fontSize: 18, color }}>{value}</p>
    </div>
  );
}

function PaymentRow({ payment, index }) {
  const isBkash = payment.paymentStatus === 'paid' || payment.paymentMethod === 'bkash';
  const amount = payment.fee || payment.amount || 0;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid var(--gray-100)',
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: isBkash ? '#fff0f6' : '#f0fdf4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        flexShrink: 0,
      }}>
        {isBkash ? '📱' : '💵'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14 }}>{payment.name || payment.patientName || 'Patient'}</p>
        <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
          {payment.date || formatDate(new Date())} · {isBkash ? 'bKash' : 'Cash'}
          {payment.trxId && ` · TxID: ${payment.trxId}`}
        </p>
      </div>
      <span style={{ fontWeight: 700, color: '#059669', fontSize: 15 }}>+{formatTaka(amount)}</span>
    </div>
  );
}

function PendingBookingRow({ booking }) {
  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '1px solid var(--gray-100)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>{booking.patientName}</p>
          <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{booking.phone} · {booking.date}</p>
          {booking.trxId && (
            <p style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>
              TrxID: <strong>{booking.trxId}</strong>
            </p>
          )}
        </div>
        <span style={{
          background: '#fff7ed',
          color: '#c2410c',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 20,
          border: '1px solid #fed7aa',
        }}>
          Pending
        </span>
      </div>
    </div>
  );
}
