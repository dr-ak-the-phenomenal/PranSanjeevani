import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  doc, onSnapshot, collection, query, where,
  orderBy, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  formatDate, formatAge, conditionColor, formatTaka, todayString
} from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Stethoscope, Edit2, Save, X, Phone,
  MapPin, AlertCircle, Clock, Activity, Pill,
  FileText, ChevronRight, Calendar
} from 'lucide-react';

const CHRONIC_CONDITIONS = [
  'DM', 'HTN', 'Asthma', 'CKD', 'IHD', 'COPD',
  'Epilepsy', 'Hypothyroid', 'Liver Disease', 'Cancer',
];

export default function PatientDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | history

  // Patient listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'patients', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setPatient(data);
        setEditForm({
          name: data.name || '',
          age: data.age || '',
          sex: data.sex || 'Male',
          phone: data.phone || '',
          address: data.address || '',
          chronicConditions: data.chronicConditions || [],
          allergies: (data.allergies || []).join(', '),
          currentMedications: (data.currentMedications || []).join(', '),
          notes: data.notes || '',
        });
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [id]);

  // Prescription history
  useEffect(() => {
    const q = query(
      collection(db, 'prescriptions'),
      where('patientId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPrescriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [id]);

  const toggleCondition = (cond) => {
    setEditForm(f => ({
      ...f,
      chronicConditions: f.chronicConditions.includes(cond)
        ? f.chronicConditions.filter(c => c !== cond)
        : [...f.chronicConditions, cond],
    }));
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'patients', id), {
        name: editForm.name.trim(),
        age: parseInt(editForm.age) || patient.age,
        sex: editForm.sex,
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        chronicConditions: editForm.chronicConditions,
        allergies: editForm.allergies
          ? editForm.allergies.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        currentMedications: editForm.currentMedications
          ? editForm.currentMedications.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        notes: editForm.notes.trim(),
      });
      toast.success('Patient updated');
      setEditing(false);
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const startConsultation = () => {
    navigate(`/consultation/${id}`);
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid var(--gray-100)',
          borderTopColor: 'var(--navy)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ flex: 1, padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--gray-500)' }}>Patient not found</p>
        <button onClick={() => navigate('/patients')} style={backBtnStyle}>Go Back</button>
      </div>
    );
  }

  const hasAllergies = patient.allergies?.length > 0;
  const hasConditions = patient.chronicConditions?.length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'var(--gradient-navy)',
        padding: '12px 20px 0',
        color: 'white',
        boxShadow: 'var(--shadow-header)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => navigate('/patients')} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex',
          }}>
            <ArrowLeft size={18} color="white" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
              {patient.name}
            </h1>
            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              {formatAge(patient.age, patient.sex)}
              {patient.phone ? ` · ${patient.phone}` : ''}
            </p>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{
              background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, color: 'white',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
            }}>
              <Edit2 size={13} /> Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditing(false)} style={{
                background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                color: 'white', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
              }}>
                <X size={13} />
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                background: saving ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)',
                border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                color: 'var(--navy)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Save size={13} /> {saving ? '...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {['overview', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid white' : '3px solid transparent',
                color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.6)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 0',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'history' ? `History (${prescriptions.length})` : 'Overview'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 88px' }}>
        {activeTab === 'overview' ? (
          editing
            ? <EditView form={editForm} setForm={setEditForm} toggleCondition={toggleCondition} />
            : <OverviewView patient={patient} />
        ) : (
          <HistoryView prescriptions={prescriptions} navigate={navigate} />
        )}
      </div>

      {/* Sticky CTA */}
      {!editing && (
        <div style={{
          position: 'fixed',
          bottom: 68,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          padding: '12px 16px',
          background: 'white',
          borderTop: '1px solid var(--gray-100)',
          zIndex: 100,
        }}>
          <button
            onClick={startConsultation}
            style={{
              width: '100%',
              background: 'var(--gradient-navy)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: '14px',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-button)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Stethoscope size={18} />
            Start Consultation
          </button>
        </div>
      )}
    </div>
  );
}

function OverviewView({ patient }) {
  const hasConditions = patient.chronicConditions?.length > 0;
  const hasAllergies = patient.allergies?.length > 0;
  const hasMeds = patient.currentMedications?.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Allergy Alert */}
      {hasAllergies && (
        <div style={{
          background: 'var(--red-light)',
          border: '1.5px solid #fca5a5',
          borderRadius: 'var(--radius-card)',
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          animation: 'fadeIn 0.3s ease',
        }}>
          <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, color: '#991b1b', fontSize: 13, marginBottom: 4 }}>
              ⚠ Known Drug Allergies
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {patient.allergies.map(a => (
                <span key={a} style={{
                  background: 'white',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <InfoCard title="Patient Info" icon={<Activity size={15} />}>
        <InfoRow label="Age / Sex" value={`${patient.age} years / ${patient.sex}`} />
        {patient.phone && <InfoRow label="Phone" value={patient.phone} icon={<Phone size={13} />} />}
        {patient.address && <InfoRow label="Address" value={patient.address} icon={<MapPin size={13} />} />}
        <InfoRow label="Patient ID" value={patient.patientId} mono />
        <InfoRow label="Total Visits" value={`${patient.visitCount || 0} visits`} />
        {patient.lastVisit && (
          <InfoRow label="Last Visit" value={
            patient.lastVisit?.toDate
              ? formatDate(patient.lastVisit.toDate())
              : 'Today'
          } icon={<Calendar size={13} />} />
        )}
      </InfoCard>

      {/* Chronic Conditions */}
      <InfoCard title="Chronic Conditions" icon={<Activity size={15} />}>
        {hasConditions ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {patient.chronicConditions.map(c => (
              <span key={c} className={`badge ${conditionColor(c)}`} style={{ fontSize: 13, padding: '5px 14px' }}>
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--gray-400)', fontSize: 13, fontStyle: 'italic' }}>
            No chronic conditions recorded
          </p>
        )}
      </InfoCard>

      {/* Current Medications */}
      {hasMeds && (
        <InfoCard title="Current Medications" icon={<Pill size={15} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {patient.currentMedications.map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 0',
                borderBottom: i < patient.currentMedications.length - 1 ? '1px solid var(--gray-100)' : 'none',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--navy)', flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--gray-700)' }}>{m}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Notes */}
      {patient.notes && (
        <InfoCard title="Clinical Notes" icon={<FileText size={15} />}>
          <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6 }}>
            {patient.notes}
          </p>
        </InfoCard>
      )}
    </div>
  );
}

function InfoCard({ title, icon, children }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--gray-100)',
      overflow: 'hidden',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        padding: '11px 16px',
        borderBottom: '1px solid var(--gray-100)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--gray-50)',
      }}>
        <span style={{ color: 'var(--navy)' }}>{icon}</span>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </p>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon, mono }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '6px 0',
      borderBottom: '1px solid var(--gray-50)',
    }}>
      <p style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>{label}</p>
      <p style={{
        fontSize: 13, color: 'var(--gray-800)', fontWeight: 600,
        textAlign: 'right', maxWidth: '60%',
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {value}
      </p>
    </div>
  );
}

function HistoryView({ prescriptions, navigate }) {
  if (prescriptions.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>No consultations yet</p>
        <p style={{ color: 'var(--gray-300)', fontSize: 12, marginTop: 6 }}>
          Start a consultation to record history
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {prescriptions.map(rx => (
        <div
          key={rx.id}
          onClick={() => navigate(`/prescription/view/${rx.id}`)}
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
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(15,76,129,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>💊</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
              {rx.finalDiagnosis || rx.chiefComplaint || 'Consultation'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
              {rx.date ? formatDate(rx.date) : 'Date unknown'}
              {rx.medicines?.length ? ` · ${rx.medicines.length} medicines` : ''}
            </p>
          </div>
          <ChevronRight size={15} color="var(--gray-300)" />
        </div>
      ))}
    </div>
  );
}

// Edit Mode Component
function EditView({ form, setForm, toggleCondition }) {
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <EditSection title="Basic Info">
        <EditField label="Full Name *">
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Full name" style={inputStyle} />
        </EditField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <EditField label="Age">
            <input type="number" value={form.age} onChange={e => set('age', e.target.value)}
              placeholder="Years" style={inputStyle} />
          </EditField>
          <EditField label="Sex">
            <select value={form.sex} onChange={e => set('sex', e.target.value)} style={inputStyle}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </EditField>
        </div>
        <EditField label="Phone">
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="01XXXXXXXXX" style={inputStyle} />
        </EditField>
        <EditField label="Address">
          <input value={form.address} onChange={e => set('address', e.target.value)}
            placeholder="Address" style={inputStyle} />
        </EditField>
      </EditSection>

      <EditSection title="Chronic Conditions">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CHRONIC_CONDITIONS.map(c => (
            <button key={c} onClick={() => toggleCondition(c)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              background: form.chronicConditions.includes(c) ? 'var(--navy)' : 'white',
              borderColor: form.chronicConditions.includes(c) ? 'var(--navy)' : 'var(--gray-200)',
              color: form.chronicConditions.includes(c) ? 'white' : 'var(--gray-600)',
            }}>{c}</button>
          ))}
        </div>
      </EditSection>

      <EditSection title="Medications & Allergies">
        <EditField label="Drug Allergies (comma separated)">
          <input value={form.allergies} onChange={e => set('allergies', e.target.value)}
            placeholder="e.g. Penicillin, Sulfa" style={inputStyle} />
        </EditField>
        <EditField label="Current Medications (comma separated)">
          <input value={form.currentMedications} onChange={e => set('currentMedications', e.target.value)}
            placeholder="e.g. Metformin 500mg" style={inputStyle} />
        </EditField>
        <EditField label="Notes">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Clinical notes..." style={{ ...inputStyle, resize: 'none' }} />
        </EditField>
      </EditSection>
    </div>
  );
}

function EditSection({ title, children }) {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-card)', border: '1px solid var(--gray-100)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '11px 16px', borderBottom: '1px solid var(--gray-100)',
        background: 'var(--gray-50)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </p>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function EditField({ label, children }) {
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

const backBtnStyle = {
  marginTop: 16,
  background: 'var(--navy)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};
