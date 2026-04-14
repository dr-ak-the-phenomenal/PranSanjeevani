import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, where, getDocs, limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate, formatAge, conditionColor, generatePatientId, todayString } from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  Search, UserPlus, ChevronRight, Users, X, Phone,
  Calendar, Activity, AlertCircle
} from 'lucide-react';

const CHRONIC_CONDITIONS = [
  'DM', 'HTN', 'Asthma', 'CKD', 'IHD', 'COPD',
  'Epilepsy', 'Hypothyroid', 'Liver Disease', 'Cancer',
];

const EMPTY_FORM = {
  name: '', age: '', sex: 'Male', phone: '', address: '',
  chronicConditions: [], allergies: '', currentMedications: '', notes: '',
};

export default function PatientsScreen() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Real-time patients listener
  useEffect(() => {
    const q = query(collection(db, 'patients'), orderBy('lastVisit', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPatients(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const filtered = patients.filter(p => {
    if (!searchText.trim()) return true;
    const s = searchText.toLowerCase();
    return (
      p.name?.toLowerCase().includes(s) ||
      p.phone?.includes(s) ||
      p.chronicConditions?.some(c => c.toLowerCase().includes(s))
    );
  });

  const toggleCondition = (cond) => {
    setForm(f => ({
      ...f,
      chronicConditions: f.chronicConditions.includes(cond)
        ? f.chronicConditions.filter(c => c !== cond)
        : [...f.chronicConditions, cond],
    }));
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Patient name required'); return; }
    if (!form.age || isNaN(form.age)) { toast.error('Valid age required'); return; }
    setSubmitting(true);
    try {
      // Check if patient with same phone exists
      let patientId = generatePatientId();
      if (form.phone.trim()) {
        const existing = await getDocs(
          query(collection(db, 'patients'), where('phone', '==', form.phone.trim()), limit(1))
        );
        if (!existing.empty) {
          toast.error('A patient with this phone number already exists');
          setSubmitting(false);
          return;
        }
      }
      const allergiesArr = form.allergies
        ? form.allergies.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const medsArr = form.currentMedications
        ? form.currentMedications.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const docRef = await addDoc(collection(db, 'patients'), {
        patientId,
        name: form.name.trim(),
        age: parseInt(form.age),
        sex: form.sex,
        phone: form.phone.trim(),
        address: form.address.trim(),
        chronicConditions: form.chronicConditions,
        allergies: allergiesArr,
        currentMedications: medsArr,
        notes: form.notes.trim(),
        visitCount: 0,
        createdAt: serverTimestamp(),
        lastVisit: serverTimestamp(),
      });
      toast.success('Patient added successfully');
      setShowAdd(false);
      setForm(EMPTY_FORM);
      navigate(`/patients/${docRef.id}`);
    } catch (err) {
      toast.error('Failed to add patient');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'var(--gradient-navy)',
        padding: '16px 20px 12px',
        color: 'white',
        boxShadow: 'var(--shadow-header)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
              Patients
            </h1>
            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              {patients.length} total records
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.5)',
              borderRadius: 10,
              padding: '8px 14px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <UserPlus size={15} />
            Add
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.6)',
          }} />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search by name, phone, condition..."
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: 10,
              padding: '9px 12px 9px 34px',
              color: 'white',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'var(--font-body)',
            }}
          />
          {searchText && (
            <button onClick={() => setSearchText('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              padding: 2,
            }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Patient List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 88px' }}>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState searchText={searchText} onAdd={() => setShowAdd(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(p => (
              <PatientCard key={p.id} patient={p} onClick={() => navigate(`/patients/${p.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAdd && (
        <AddPatientModal
          form={form}
          setForm={setForm}
          onClose={() => { setShowAdd(false); setForm(EMPTY_FORM); }}
          onSubmit={handleAdd}
          submitting={submitting}
          toggleCondition={toggleCondition}
        />
      )}
    </div>
  );
}

function PatientCard({ patient, onClick }) {
  const hasConditions = patient.chronicConditions?.length > 0;
  const hasAllergies = patient.allergies?.length > 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-card)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--gray-100)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        animation: 'fadeIn 0.3s ease',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(15,76,129,0.12), rgba(26,107,181,0.18))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}>
        {patient.sex === 'Female' ? '👩' : patient.sex === 'Other' ? '🧑' : '👨'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)', letterSpacing: '-0.01em' }}>
            {patient.name}
          </p>
          {patient.visitCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600, flexShrink: 0 }}>
              {patient.visitCount} visit{patient.visitCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
          {formatAge(patient.age, patient.sex)}
          {patient.phone ? ` · ${patient.phone}` : ''}
        </p>

        {/* Conditions + Allergies */}
        {(hasConditions || hasAllergies) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
            {patient.chronicConditions?.slice(0, 4).map(c => (
              <span key={c} className={`badge ${conditionColor(c)}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                {c}
              </span>
            ))}
            {patient.chronicConditions?.length > 4 && (
              <span className="badge badge-gray" style={{ fontSize: 10, padding: '2px 8px' }}>
                +{patient.chronicConditions.length - 4}
              </span>
            )}
            {hasAllergies && (
              <span style={{
                fontSize: 10, padding: '2px 8px',
                background: 'var(--red-light)', color: '#991b1b',
                borderRadius: 20, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                ⚠ Allergies
              </span>
            )}
          </div>
        )}
      </div>

      <ChevronRight size={16} color="var(--gray-300)" style={{ flexShrink: 0 }} />
    </div>
  );
}

function AddPatientModal({ form, setForm, onClose, onSubmit, submitting, toggleCondition }) {
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px 24px 0 0',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--navy)' }}>
            New Patient
          </h2>
          <button onClick={onClose} style={{
            background: 'var(--gray-100)', border: 'none', borderRadius: 8,
            padding: 6, cursor: 'pointer', display: 'flex',
          }}>
            <X size={18} color="var(--gray-600)" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          <Section title="Basic Info">
            <InputRow label="Full Name *">
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Patient's full name"
                style={inputStyle}
              />
            </InputRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputRow label="Age *">
                <input
                  type="number"
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  placeholder="Years"
                  style={inputStyle}
                />
              </InputRow>
              <InputRow label="Sex">
                <select value={form.sex} onChange={e => set('sex', e.target.value)} style={inputStyle}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </InputRow>
            </div>
            <InputRow label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="01XXXXXXXXX"
                style={inputStyle}
              />
            </InputRow>
            <InputRow label="Address">
              <input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Village / Upazila / District"
                style={inputStyle}
              />
            </InputRow>
          </Section>

          <Section title="Chronic Conditions">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CHRONIC_CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCondition(c)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: '1.5px solid',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                    background: form.chronicConditions.includes(c) ? 'var(--navy)' : 'white',
                    borderColor: form.chronicConditions.includes(c) ? 'var(--navy)' : 'var(--gray-200)',
                    color: form.chronicConditions.includes(c) ? 'white' : 'var(--gray-600)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Medications & Allergies">
            <InputRow label="Known Drug Allergies">
              <input
                value={form.allergies}
                onChange={e => set('allergies', e.target.value)}
                placeholder="e.g. Penicillin, Sulfa (comma separated)"
                style={inputStyle}
              />
            </InputRow>
            <InputRow label="Current Medications">
              <input
                value={form.currentMedications}
                onChange={e => set('currentMedications', e.target.value)}
                placeholder="e.g. Metformin, Amlodipine"
                style={inputStyle}
              />
            </InputRow>
            <InputRow label="Notes">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any other relevant information..."
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </InputRow>
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--gray-100)',
          flexShrink: 0,
        }}>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              background: submitting ? 'var(--gray-300)' : 'var(--gradient-navy)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: '14px',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : 'var(--shadow-button)',
            }}
          >
            {submitting ? 'Saving...' : '+ Add Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        fontSize: 12, fontWeight: 700, color: 'var(--navy)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 12,
      }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function InputRow({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  border: '1.5px solid var(--gray-200)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  color: 'var(--gray-900)',
  outline: 'none',
  background: 'white',
};

function LoadingState() {
  return (
    <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid var(--gray-100)',
        borderTopColor: 'var(--navy)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Loading patients...</p>
    </div>
  );
}

function EmptyState({ searchText, onAdd }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{searchText ? '🔍' : '👥'}</div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gray-700)', marginBottom: 8 }}>
        {searchText ? 'No patients found' : 'No patients yet'}
      </p>
      <p style={{ fontSize: 13, color: 'var(--gray-400)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 24px' }}>
        {searchText
          ? `No results for "${searchText}"`
          : 'Patient records are created when you add a walk-in or they are linked from the queue.'}
      </p>
      {!searchText && (
        <button
          onClick={onAdd}
          style={{
            background: 'var(--gradient-navy)',
            color: 'white', border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: '12px 24px',
            fontFamily: 'var(--font-body)',
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-button)',
          }}
        >
          Add First Patient
        </button>
      )}
    </div>
  );
}
