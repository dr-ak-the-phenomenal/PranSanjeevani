import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot,
  addDoc, doc, updateDoc, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  formatDateLong, todayString, formatTaka, getGreeting, generatePatientId
} from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  waiting:     { label: 'Waiting',  cls: 'badge-yellow' },
  'in-progress': { label: 'Seeing', cls: 'badge-blue' },
  completed:   { label: 'Done',    cls: 'badge-gray'  },
};

const PAYMENT_STYLES = {
  paid:    { label: 'Paid',    cls: 'badge-green' },
  cash:    { label: 'Cash',   cls: 'badge-yellow' },
  pending: { label: 'Pending', cls: 'badge-red'   },
};

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    name: '', age: '', sex: 'Male', phone: '', chiefComplaint: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [showPendingDetail, setShowPendingDetail] = useState(null);
  const [confirmingBooking, setConfirmingBooking] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const today = todayString();

  // Online/offline listener
  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  // Real-time pending bookings listener
  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setPendingBookings(items);
    });
    return unsub;
  }, []);

  const confirmBooking = async (booking) => {
    setConfirmingBooking(booking.id);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
      });
      // Also add to today's queue if booking is for today
      if (booking.date === today) {
        const nextToken = queue.length + 1;
        const patientId = generatePatientId();
        await addDoc(collection(db, 'queue'), {
          name: booking.patientName,
          age: booking.age || 0,
          sex: booking.sex || 'Unknown',
          phone: booking.phone,
          chiefComplaint: booking.complaint || '',
          token: nextToken,
          date: today,
          status: 'waiting',
          type: 'booking',
          paymentStatus: 'paid',
          paymentMethod: 'bkash',
          fee: booking.amount || settings.consultationFee || 500,
          patientId,
          bookingId: booking.id,
          createdAt: serverTimestamp(),
        });
      }
      toast.success(`✓ Booking confirmed for ${booking.patientName}`);
      setShowPendingDetail(null);
    } catch {
      toast.error('Failed to confirm booking');
    } finally {
      setConfirmingBooking(null);
    }
  };

  const rejectBooking = async (booking) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'rejected' });
      toast.success('Booking rejected');
      setShowPendingDetail(null);
    } catch {
      toast.error('Failed to reject booking');
    }
  };

  // Real-time queue listener
  useEffect(() => {
    const q = query(
      collection(db, 'queue'),
      where('date', '==', today)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.token || 0) - (b.token || 0));
      setQueue(items);
      setLoadingQueue(false);
    }, () => setLoadingQueue(false));
    return unsub;
  }, [today]);

  // Stats
  const total = queue.length;
  const seen = queue.filter(p => p.status === 'completed').length;
  const waiting = queue.filter(p => p.status !== 'completed').length;
  const income = queue
    .filter(p => p.paymentStatus === 'paid' || p.paymentStatus === 'cash')
    .reduce((sum, p) => sum + (p.fee || 0), 0);

  // Walk-in submit
  const handleWalkIn = async () => {
    const { name, age, sex, phone, chiefComplaint } = walkInForm;
    if (!name.trim()) return toast.error('Patient name required');
    if (!age) return toast.error('Age required');
    setSubmitting(true);
    try {
      const nextToken = queue.length + 1;
      const patientId = generatePatientId();

      // Try to find existing patient by phone
      let existingPatientId = null;
      if (phone) {
        // We'll match in Phase 2 when patient collection is built
        existingPatientId = null;
      }

      // Create patient record if new
      if (!existingPatientId) {
        await addDoc(collection(db, 'patients'), {
          patientId,
          name: name.trim(),
          age: parseInt(age),
          sex,
          phone: phone.trim(),
          address: '',
          chronicConditions: [],
          allergies: [],
          currentMedications: [],
          notes: '',
          createdAt: serverTimestamp(),
          lastVisit: serverTimestamp(),
          visitCount: 1,
        });
      }

      // Add to queue
      await addDoc(collection(db, 'queue'), {
        name: name.trim(),
        age: parseInt(age),
        sex,
        phone: phone.trim(),
        chiefComplaint: chiefComplaint.trim(),
        token: nextToken,
        date: today,
        status: 'waiting',
        type: 'walkin',
        paymentStatus: 'cash',
        fee: settings.consultationFee || 500,
        patientId: existingPatientId || patientId,
        createdAt: serverTimestamp(),
      });

      toast.success(`Token #${nextToken} assigned to ${name}`);
      setShowWalkIn(false);
      setWalkInForm({ name: '', age: '', sex: 'Male', phone: '', chiefComplaint: '' });
    } catch (err) {
      toast.error('Failed to add patient: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const markStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'queue', id), { status });
    } catch {
      toast.error('Update failed');
    }
  };

  const markPayment = async (id, paymentStatus) => {
    try {
      await updateDoc(doc(db, 'queue', id), { paymentStatus });
      if (paymentStatus === 'paid' || paymentStatus === 'cash') {
        toast.success('Payment recorded');
      }
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        padding: '20px 20px 24px',
        color: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 2 }}>
              {getGreeting()},
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '-0.3px',
            }}>
              {settings.doctorName}
            </h1>
            <p style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
              {formatDateLong(new Date())}
            </p>
          </div>
          <button
            onClick={() => { logout(); }}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#10b981' }}>{seen}</div>
          <div className="stat-label">Seen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f59e0b' }}>{waiting}</div>
          <div className="stat-label">Waiting</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-value">{formatTaka(income)}</div>
          <div className="stat-label">Today's Income</div>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div style={{
          background: '#fef3c7',
          borderBottom: '1px solid #fcd34d',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#92400e',
          fontWeight: 600,
        }}>
          <span>📴</span>
          Offline Mode — Changes will sync when reconnected
        </div>
      )}

      {/* Walk-in Button */}
      <div style={{ padding: '0 16px 12px' }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => setShowWalkIn(true)}
          style={{ fontSize: 15 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Walk-in Patient
        </button>
      </div>

      {/* Pending Bookings Alert */}
      {pendingBookings.length > 0 && (
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{
            background: '#fff7ed',
            border: '1.5px solid #fed7aa',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              borderBottom: '1px solid #fed7aa',
            }}>
              <span style={{ fontSize: 18 }}>📱</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#9a3412' }}>
                  {pendingBookings.length} Pending bKash Booking{pendingBookings.length > 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: 12, color: '#c2410c' }}>Tap to verify & confirm</p>
              </div>
            </div>
            {pendingBookings.slice(0, 3).map(booking => (
              <div
                key={booking.id}
                onClick={() => setShowPendingDetail(booking)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #fed7aa',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#7c2d12' }}>{booking.patientName}</p>
                  <p style={{ fontSize: 11, color: '#c2410c' }}>
                    {booking.date} · TrxID: <strong>{booking.trxId}</strong>
                  </p>
                </div>
                <span style={{
                  fontSize: 11,
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 700,
                  border: '1px solid #fcd34d',
                }}>
                  ৳{booking.amount || settings.consultationFee || 500}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Booking Detail Modal */}
      {showPendingDetail && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPendingDetail(null)}>
          <div className="modal-sheet">
            <div className="modal-handle"/>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Verify bKash Payment</h2>
              <button onClick={() => setShowPendingDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#fff7ed', borderRadius: 12, padding: '14px', marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#9a3412', marginBottom: 6 }}>Check your bKash app for this transaction:</p>
                <p style={{ fontWeight: 800, fontSize: 20, letterSpacing: 2, fontFamily: 'monospace', color: '#e8347a' }}>
                  {showPendingDetail.trxId}
                </p>
                <p style={{ fontSize: 13, color: '#9a3412', marginTop: 4 }}>
                  Amount: <strong>৳{showPendingDetail.amount || settings.consultationFee}</strong>
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                {[
                  ['Patient', showPendingDetail.patientName],
                  ['Phone', showPendingDetail.phone],
                  ['Date', showPendingDetail.date],
                  ['Session', showPendingDetail.session],
                  ['Complaint', showPendingDetail.complaint || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
                    <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="btn btn-sm"
                  style={{ background: '#fee2e2', color: '#991b1b', padding: '12px' }}
                  onClick={() => rejectBooking(showPendingDetail)}
                >
                  ✗ Reject
                </button>
                <button
                  className="btn btn-primary"
                  style={{ padding: '12px' }}
                  onClick={() => confirmBooking(showPendingDetail)}
                  disabled={confirmingBooking === showPendingDetail.id}
                >
                  {confirmingBooking === showPendingDetail.id
                    ? <span className="spinner"/>
                    : '✓ Confirm'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue */}
      <div style={{ padding: '0 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <p className="section-title" style={{ margin: 0 }}>Today's Queue</p>
          <button
            onClick={() => navigate('/followups')}
            style={{
              background: 'none',
              border: '1px solid var(--navy)',
              borderRadius: 8,
              color: 'var(--navy)',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            📅 Follow-ups
          </button>
        </div>

        {loadingQueue ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
            <div className="spinner spinner-navy" style={{ margin: '0 auto 8px' }}/>
            <p style={{ fontSize: 14 }}>Loading queue...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏥</div>
            <h3>No patients yet</h3>
            <p>Add a walk-in patient to get started</p>
          </div>
        ) : (
          queue.map((patient, i) => (
            <PatientQueueCard
              key={patient.id}
              patient={patient}
              onConsult={() => navigate(`/consultation/${patient.patientId || patient.id}`)}
              onStatusChange={(s) => markStatus(patient.id, s)}
              onPaymentChange={(p) => markPayment(patient.id, p)}
              index={i}
            />
          ))
        )}
      </div>

      {/* Walk-in Modal */}
      {showWalkIn && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowWalkIn(false)}>
          <div className="modal-sheet">
            <div className="modal-handle"/>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>New Walk-in Patient</h2>
              <button
                onClick={() => setShowWalkIn(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Patient Name *</label>
                <input
                  className="input-field"
                  placeholder="Full name"
                  value={walkInForm.name}
                  onChange={e => setWalkInForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Age *</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Years"
                    value={walkInForm.age}
                    onChange={e => setWalkInForm(f => ({ ...f, age: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Sex</label>
                  <select
                    className="input-field"
                    value={walkInForm.sex}
                    onChange={e => setWalkInForm(f => ({ ...f, sex: e.target.value }))}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Phone</label>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={walkInForm.phone}
                  onChange={e => setWalkInForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Chief Complaint</label>
                <input
                  className="input-field"
                  placeholder="e.g. Fever, Cough, Headache"
                  value={walkInForm.chiefComplaint}
                  onChange={e => setWalkInForm(f => ({ ...f, chiefComplaint: e.target.value }))}
                />
              </div>

              <div style={{
                background: 'var(--gray-50)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: 'var(--gray-600)',
              }}>
                <strong>Fee:</strong> {formatTaka(settings.consultationFee)} &nbsp;|&nbsp;
                <strong>Token:</strong> #{queue.length + 1}
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={handleWalkIn}
                disabled={submitting}
              >
                {submitting ? <span className="spinner"/> : 'Add to Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientQueueCard({ patient, onConsult, onStatusChange, onPaymentChange, index }) {
  const [showActions, setShowActions] = useState(false);
  const status = STATUS_STYLES[patient.status] || STATUS_STYLES.waiting;
  const payment = PAYMENT_STYLES[patient.paymentStatus] || PAYMENT_STYLES.pending;

  return (
    <div
      className="card fade-in"
      style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer' }}
      onClick={() => setShowActions(v => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Token */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 15,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {patient.token}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{patient.name}</span>
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {patient.age}y / {patient.sex?.charAt(0)}
            </span>
          </div>
          {patient.chiefComplaint && (
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {patient.chiefComplaint}
            </p>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span className={`badge ${status.cls}`}>{status.label}</span>
            <span className={`badge ${payment.cls}`}>{payment.label}</span>
          </div>
        </div>
      </div>

      {/* Action buttons (expanded) */}
      {showActions && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--gray-100)',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); onConsult(); }}
          >
            Consult
          </button>
          {patient.status !== 'completed' && (
            <button
              className="btn btn-sm"
              style={{ background: '#d1fae5', color: '#065f46' }}
              onClick={(e) => { e.stopPropagation(); onStatusChange('completed'); }}
            >
              Mark Done
            </button>
          )}
          {patient.paymentStatus === 'pending' && (
            <button
              className="btn btn-sm"
              style={{ background: '#d1fae5', color: '#065f46' }}
              onClick={(e) => { e.stopPropagation(); onPaymentChange('cash'); }}
            >
              Mark Paid (Cash)
            </button>
          )}
          {patient.paymentStatus === 'cash' && (
            <button
              className="btn btn-sm badge-green"
              onClick={(e) => { e.stopPropagation(); onPaymentChange('paid'); }}
            >
              ✓ Verified
            </button>
          )}
        </div>
      )}
    </div>
  );
}
