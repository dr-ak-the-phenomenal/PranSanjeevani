import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate, todayString } from '../utils/helpers';
import { format, parseISO, isToday, isTomorrow, isPast, addDays } from 'date-fns';

export default function FollowUpScreen() {
  const navigate = useNavigate();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'today' | 'overdue'

  const today = todayString();

  useEffect(() => {
    // Load all prescriptions that have a followUpDate
    const q = query(
      collection(db, 'prescriptions'),
      where('followUpDate', '>=', format(addDays(new Date(), -30), 'yyyy-MM-dd'))
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.followUpDate)
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
      setFollowUps(items);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const overdueList = followUps.filter(f => f.followUpDate < today);
  const todayList = followUps.filter(f => f.followUpDate === today);
  const upcomingList = followUps.filter(f => f.followUpDate > today);

  const displayList =
    filter === 'today' ? todayList :
    filter === 'overdue' ? overdueList :
    upcomingList;

  const getDateLabel = (dateStr) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return { text: 'Today', color: '#059669', bg: '#d1fae5' };
      if (isTomorrow(d)) return { text: 'Tomorrow', color: '#d97706', bg: '#fef3c7' };
      if (isPast(d)) return { text: 'Overdue', color: '#dc2626', bg: '#fee2e2' };
      return { text: format(d, 'dd MMM'), color: '#0f4c81', bg: '#dbeafe' };
    } catch {
      return { text: dateStr, color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100, background: 'var(--off-white)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        padding: '20px 20px 24px',
        color: 'white',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 14, padding: '0 0 8px', fontFamily: 'var(--font-body)' }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Follow-ups
        </h1>
        <p style={{ fontSize: 13, opacity: 0.8 }}>Scheduled return visits</p>

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[
            { key: 'overdue', label: `${overdueList.length} Overdue`, color: '#fca5a5' },
            { key: 'today', label: `${todayList.length} Today`, color: '#6ee7b7' },
            { key: 'upcoming', label: `${upcomingList.length} Upcoming`, color: '#bfdbfe' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                background: filter === key ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)',
                color: filter === key ? '#0f4c81' : 'white',
                border: 'none',
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-body)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner spinner-navy" style={{ margin: '0 auto' }}/>
          </div>
        )}

        {!loading && displayList.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
            <h3>No {filter} follow-ups</h3>
            <p>Follow-up dates set in prescriptions will appear here</p>
          </div>
        )}

        {!loading && displayList.map((item, i) => {
          const dateInfo = getDateLabel(item.followUpDate);
          return (
            <div
              key={item.id}
              className="card fade-in"
              style={{ animationDelay: `${i * 0.04}s`, cursor: 'pointer' }}
              onClick={() => navigate(`/prescription/view/${item.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Date badge */}
                <div style={{
                  background: dateInfo.bg,
                  color: dateInfo.color,
                  borderRadius: 10,
                  padding: '8px 10px',
                  textAlign: 'center',
                  minWidth: 56,
                  flexShrink: 0,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{dateInfo.text}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>
                    {item.followUpDate ? format(parseISO(item.followUpDate), 'MMM') : ''}
                  </p>
                </div>

                {/* Patient info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>{item.patientName || 'Patient'}</p>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                    {item.diagnosis || item.provisionalDiagnosis || 'No diagnosis recorded'}
                  </p>
                  {item.followUpNotes && (
                    <p style={{
                      fontSize: 12,
                      color: 'var(--navy)',
                      marginTop: 4,
                      background: 'rgba(15,76,129,0.06)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      display: 'inline-block',
                    }}>
                      📝 {item.followUpNotes}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                    Rx: {item.prescriptionId || item.id?.slice(-6)} · {formatDate(item.createdAt?.toDate?.() || new Date())}
                  </p>
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
