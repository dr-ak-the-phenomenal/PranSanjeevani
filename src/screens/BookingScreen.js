import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, addDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const DOCTOR = {
  name: 'Dr. Anup Kumar Paul',
  degree: 'MBBS (Dhaka)',
  designation: 'Ex-Lecturer of Pharmacology',
  institution: 'DAMCH, Faridpur',
  bmdc: 'A-128735',
};

const STEPS = ['details', 'slot', 'payment', 'confirm'];

export default function BookingScreen() {
  const [settings, setSettings] = useState(null);
  const [step, setStep] = useState('details');
  const [bookedSlots, setBookedSlots] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    patientName: '',
    phone: '',
    age: '',
    sex: 'Male',
    complaint: '',
    date: '',
    session: 'morning',
    trxId: '',
  });
  const [tokenResult, setTokenResult] = useState(null);
  const [lang, setLang] = useState('en'); // 'en' or 'bn'

  const t = (en, bn) => lang === 'bn' ? bn : en;

  // Load settings from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'doctor'), (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
    return unsubscribe;
  }, []);

  // Get available dates (next 7 days matching working days)
  function getAvailableDates() {
    if (!settings) return [];
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const workingDays = settings.workingDays || {};
    for (let i = 0; i < 14; i++) {
      const d = addDays(new Date(), i + 1);
      const dayName = dayNames[d.getDay()];
      if (workingDays[dayName]) {
        days.push(format(d, 'yyyy-MM-dd'));
      }
      if (days.length >= 7) break;
    }
    return days;
  }

  // Count existing bookings for a date/session
  async function countBookings(date, session) {
    const q = query(
      collection(db, 'bookings'),
      where('date', '==', date),
      where('session', '==', session),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const snap = await getDocs(q);
    return snap.size;
  }

  // Load booked counts for available dates
  useEffect(() => {
    if (!settings) return;
    const dates = getAvailableDates();
    const load = async () => {
      const counts = {};
      for (const date of dates) {
        const m = await countBookings(date, 'morning');
        const e = await countBookings(date, 'evening');
        counts[date] = { morning: m, evening: e };
      }
      setBookedSlots(counts);
    };
    load();
  }, [settings]);

  const maxPerSession = settings?.maxPatientsPerSession || 20;
  const fee = settings?.consultationFee || 500;
  const bkashNumber = settings?.bkashNumber || '01937242869';
  const availableDates = getAvailableDates();

  const sessionAvailable = (date, session) => {
    const settingKey = session === 'morning' ? 'morningSession' : 'eveningSession';
    if (!settings?.[settingKey]?.enabled) return false;
    const count = bookedSlots[date]?.[session] || 0;
    return count < maxPerSession;
  };

  const handleSubmit = async () => {
    const { patientName, phone, age, sex, complaint, date, session, trxId } = form;
    if (!patientName.trim()) return toast.error(t('Name required', 'নাম দিন'));
    if (!phone.trim() || phone.length < 11) return toast.error(t('Valid phone required', 'সঠিক ফোন নম্বর দিন'));
    if (!date) return toast.error(t('Select a date', 'তারিখ বেছে নিন'));
    if (!trxId.trim()) return toast.error(t('Enter bKash TrxID', 'bKash লেনদেন নম্বর দিন'));

    setSubmitting(true);
    try {
      // Count current bookings to assign token
      const existing = await countBookings(date, session);
      const token = existing + 1;

      const bookingRef = await addDoc(collection(db, 'bookings'), {
        patientName: patientName.trim(),
        phone: phone.trim(),
        age: parseInt(age) || 0,
        sex,
        complaint: complaint.trim(),
        date,
        session,
        trxId: trxId.trim(),
        amount: fee,
        paymentMethod: 'bkash',
        status: 'pending',
        token,
        createdAt: serverTimestamp(),
      });

      setTokenResult({ token, date, session, id: bookingRef.id });
      setStep('confirm');
      toast.success(t('Booking submitted!', 'বুকিং হয়েছে!'));
    } catch (err) {
      toast.error(t('Booking failed. Try again.', 'বুকিং হয়নি। আবার চেষ্টা করুন।'));
    } finally {
      setSubmitting(false);
    }
  };

  const dayLabel = (dateStr) => {
    const d = parseISO(dateStr);
    return format(d, 'EEE, dd MMM');
  };

  // ── RENDER ──────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--off-white)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        padding: '24px 20px 20px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              {t('Appointment Booking', 'অ্যাপয়েন্টমেন্ট বুকিং')}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.3,
            }}>
              {DOCTOR.name}
            </h1>
            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{DOCTOR.degree}</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>{DOCTOR.designation}</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>BM&DC: {DOCTOR.bmdc}</p>
          </div>
          <button
            onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
        </div>

        {settings && (
          <div style={{
            marginTop: 14,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 12,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            {settings.chamberName && (
              <span>🏥 {settings.chamberName}</span>
            )}
            {settings.consultationFee && (
              <span>💰 {t('Fee', 'ফি')}: ৳{settings.consultationFee}</span>
            )}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>

        {/* Step: details */}
        {step === 'details' && (
          <div className="slide-up">
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                {t('Patient Details', 'রোগীর তথ্য')}
              </h2>

              <div className="input-group">
                <label className="input-label">{t('Full Name *', 'পুরো নাম *')}</label>
                <input
                  className="input-field"
                  placeholder={t('Patient full name', 'রোগীর নাম')}
                  value={form.patientName}
                  onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <label className="input-label">{t('Mobile Number *', 'মোবাইল নম্বর *')}</label>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">{t('Age', 'বয়স')}</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder={t('Years', 'বছর')}
                    value={form.age}
                    onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('Sex', 'লিঙ্গ')}</label>
                  <select
                    className="input-field"
                    value={form.sex}
                    onChange={e => setForm(f => ({ ...f, sex: e.target.value }))}
                  >
                    <option value="Male">{t('Male', 'পুরুষ')}</option>
                    <option value="Female">{t('Female', 'মহিলা')}</option>
                    <option value="Other">{t('Other', 'অন্য')}</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t('Chief Complaint', 'মূল সমস্যা')}</label>
                <input
                  className="input-field"
                  placeholder={t('e.g. Fever, Cough, Headache', 'যেমন: জ্বর, কাশি, মাথাব্যথা')}
                  value={form.complaint}
                  onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))}
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 8 }}
                onClick={() => {
                  if (!form.patientName.trim()) return toast.error(t('Enter your name', 'নাম দিন'));
                  if (!form.phone.trim()) return toast.error(t('Enter phone', 'ফোন দিন'));
                  setStep('slot');
                }}
              >
                {t('Next: Choose Date →', 'পরবর্তী: তারিখ বেছে নিন →')}
              </button>
            </div>
          </div>
        )}

        {/* Step: slot */}
        {step === 'slot' && (
          <div className="slide-up">
            <button
              onClick={() => setStep('details')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--navy)', fontWeight: 600, fontSize: 14, marginBottom: 12, padding: '4px 0' }}
            >
              ← {t('Back', 'পিছে')}
            </button>

            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                {t('Select Date & Session', 'তারিখ ও সেশন বেছে নিন')}
              </h2>

              {availableDates.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '24px 0', fontSize: 14 }}>
                  {t('No available dates. Check back later.', 'এখন কোনো তারিখ নেই। পরে আবার দেখুন।')}
                </p>
              ) : (
                availableDates.map(date => {
                  const mAvail = sessionAvailable(date, 'morning');
                  const eAvail = sessionAvailable(date, 'evening');
                  const mCount = bookedSlots[date]?.morning || 0;
                  const eCount = bookedSlots[date]?.evening || 0;

                  return (
                    <div key={date} style={{
                      border: '1px solid var(--gray-100)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      marginBottom: 10,
                    }}>
                      <div style={{
                        background: 'var(--gray-50)',
                        padding: '8px 14px',
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--navy)',
                      }}>
                        📅 {dayLabel(date)}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                        {settings?.morningSession?.enabled && (
                          <SessionSlot
                            label={t('Morning', 'সকাল')}
                            time={`${settings.morningSession?.start || '09:00'} – ${settings.morningSession?.end || '13:00'}`}
                            available={mAvail}
                            count={mCount}
                            max={maxPerSession}
                            selected={form.date === date && form.session === 'morning'}
                            onClick={() => mAvail && setForm(f => ({ ...f, date, session: 'morning' }))}
                            lang={lang}
                          />
                        )}
                        {settings?.eveningSession?.enabled && (
                          <SessionSlot
                            label={t('Evening', 'বিকেল')}
                            time={`${settings.eveningSession?.start || '17:00'} – ${settings.eveningSession?.end || '21:00'}`}
                            available={eAvail}
                            count={eCount}
                            max={maxPerSession}
                            selected={form.date === date && form.session === 'evening'}
                            onClick={() => eAvail && setForm(f => ({ ...f, date, session: 'evening' }))}
                            lang={lang}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 16 }}
                disabled={!form.date}
                onClick={() => {
                  if (!form.date) return toast.error(t('Select a slot', 'একটি স্লট বেছে নিন'));
                  setStep('payment');
                }}
              >
                {t('Next: Payment →', 'পরবর্তী: পেমেন্ট →')}
              </button>
            </div>
          </div>
        )}

        {/* Step: payment */}
        {step === 'payment' && (
          <div className="slide-up">
            <button
              onClick={() => setStep('slot')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--navy)', fontWeight: 600, fontSize: 14, marginBottom: 12, padding: '4px 0' }}
            >
              ← {t('Back', 'পিছে')}
            </button>

            {/* Booking summary */}
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                {t('Booking Summary', 'বুকিং সারাংশ')}
              </p>
              <SummaryRow label={t('Patient', 'রোগী')} value={form.patientName} />
              <SummaryRow label={t('Date', 'তারিখ')} value={form.date ? dayLabel(form.date) : ''} />
              <SummaryRow label={t('Session', 'সেশন')} value={form.session === 'morning' ? t('Morning', 'সকাল') : t('Evening', 'বিকেল')} />
              <SummaryRow label={t('Fee', 'ফি')} value={`৳${fee}`} highlight />
            </div>

            {/* bKash instruction */}
            <div style={{
              background: '#fff0f6',
              border: '1.5px solid #f9a8d4',
              borderRadius: 14,
              padding: '16px',
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>📱</span>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#831843' }}>
                    {t('Send bKash Payment', 'bKash পেমেন্ট পাঠান')}
                  </p>
                  <p style={{ fontSize: 12, color: '#9d174d' }}>
                    {t('bKash Personal', 'বিকাশ পার্সোনাল')}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 10,
              }}>
                <p style={{ fontSize: 12, color: '#9d174d', marginBottom: 2 }}>
                  {t('Send to number:', 'এই নম্বরে পাঠান:')}
                </p>
                <p style={{
                  fontWeight: 900,
                  fontSize: 22,
                  letterSpacing: 2,
                  color: '#e8347a',
                  fontFamily: 'monospace',
                }}>
                  {bkashNumber}
                </p>
                <p style={{ fontSize: 13, color: '#831843', fontWeight: 700 }}>
                  {t('Amount', 'পরিমাণ')}: ৳{fee}
                </p>
              </div>

              <ol style={{ fontSize: 13, color: '#9d174d', paddingLeft: 16, lineHeight: 1.8, margin: 0 }}>
                <li>{t(`Open bKash → Send Money → ${bkashNumber}`, `বিকাশ খুলুন → Send Money → ${bkashNumber}`)}</li>
                <li>{t(`Amount: ৳${fee}`, `পরিমাণ: ৳${fee}`)}</li>
                <li>{t('Copy the TrxID from SMS', 'SMS থেকে TrxID কপি করুন')}</li>
                <li>{t('Paste TrxID below', 'নিচে TrxID দিন')}</li>
              </ol>
            </div>

            <div className="card">
              <div className="input-group">
                <label className="input-label">{t('bKash Transaction ID (TrxID) *', 'bKash লেনদেন নম্বর (TrxID) *')}</label>
                <input
                  className="input-field"
                  placeholder={t('e.g. 9AB3K2XXXX', 'যেমন: 9AB3K2XXXX')}
                  value={form.trxId}
                  onChange={e => setForm(f => ({ ...f, trxId: e.target.value.toUpperCase() }))}
                  style={{ fontFamily: 'monospace', letterSpacing: 1 }}
                />
              </div>

              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 16 }}>
                {t(
                  'Your booking will be confirmed after the doctor verifies your payment.',
                  'ডাক্তার পেমেন্ট যাচাই করার পরে আপনার বুকিং নিশ্চিত হবে।'
                )}
              </p>

              <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <span className="spinner"/>
                  : t('Submit Booking', 'বুকিং জমা দিন')
                }
              </button>
            </div>
          </div>
        )}

        {/* Step: confirm */}
        {step === 'confirm' && tokenResult && (
          <div className="slide-up" style={{ textAlign: 'center' }}>
            <div className="card" style={{ padding: '32px 24px' }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                margin: '0 auto 16px',
              }}>
                ✓
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: '#065f46',
                marginBottom: 8,
              }}>
                {t('Booking Submitted!', 'বুকিং সফল!')}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20, lineHeight: 1.6 }}>
                {t(
                  'Your booking is pending payment verification by the doctor.',
                  'ডাক্তার পেমেন্ট যাচাই করার পরে বুকিং নিশ্চিত হবে।'
                )}
              </p>

              <div style={{
                background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
                borderRadius: 14,
                padding: '16px',
                color: 'white',
                marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, opacity: 0.8 }}>{t('Your Token Number', 'আপনার টোকেন নম্বর')}</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800 }}>
                  #{tokenResult.token}
                </p>
                <p style={{ fontSize: 13, opacity: 0.8 }}>{tokenResult.date} · {tokenResult.session}</p>
              </div>

              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 12,
                padding: '12px',
                textAlign: 'left',
                marginBottom: 20,
                fontSize: 13,
                color: '#9a3412',
                lineHeight: 1.7,
              }}>
                ⚠️ {t(
                  'Online booking confirmation is subject to payment verification by the doctor.',
                  'অনলাইন বুকিং নিশ্চিতকরণ ডাক্তার কর্তৃক পেমেন্ট যাচাইয়ের উপর নির্ভরশীল।'
                )}
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={() => {
                  setStep('details');
                  setForm({ patientName: '', phone: '', age: '', sex: 'Male', complaint: '', date: '', session: 'morning', trxId: '' });
                  setTokenResult(null);
                }}
              >
                {t('Book Another', 'আরেকটি বুকিং')}
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--gray-400)',
          marginTop: 20,
          lineHeight: 1.6,
          padding: '0 16px 32px',
        }}>
          Pran Sanjeevani — Powered by AI · {DOCTOR.name} · BM&DC {DOCTOR.bmdc}
        </p>
      </div>
    </div>
  );
}

function SessionSlot({ label, time, available, count, max, selected, onClick, lang }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        borderRight: '1px solid var(--gray-100)',
        cursor: available ? 'pointer' : 'not-allowed',
        background: selected
          ? 'linear-gradient(135deg, #0f4c81, #1a6bb5)'
          : available ? 'white' : 'var(--gray-50)',
        transition: 'all 0.2s',
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 13, color: selected ? 'white' : available ? 'var(--navy)' : 'var(--gray-300)', marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: 11, color: selected ? 'rgba(255,255,255,0.75)' : 'var(--gray-400)', marginBottom: 4 }}>
        {time}
      </p>
      {available ? (
        <span style={{
          fontSize: 11,
          background: selected ? 'rgba(255,255,255,0.2)' : '#d1fae5',
          color: selected ? 'white' : '#065f46',
          padding: '2px 8px',
          borderRadius: 10,
          fontWeight: 600,
        }}>
          {max - count} left
        </span>
      ) : (
        <span style={{
          fontSize: 11,
          background: '#fee2e2',
          color: '#991b1b',
          padding: '2px 8px',
          borderRadius: 10,
          fontWeight: 600,
        }}>
          Full
        </span>
      )}
    </div>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid var(--gray-100)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontWeight: highlight ? 800 : 600,
        color: highlight ? '#059669' : 'var(--gray-700)',
      }}>
        {value}
      </span>
    </div>
  );
}
