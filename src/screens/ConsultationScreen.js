import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  doc, onSnapshot, collection, addDoc,
  updateDoc, serverTimestamp, query, where,
  getDocs, limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../context/SettingsContext';
import {
  todayString, formatAge, conditionColor, generatePrescriptionId
} from '../utils/helpers';
import { checkEmergencyFlags } from '../ai/safetyRules';
import AIChat from '../components/AIChat';
import toast from 'react-hot-toast';
import {
  ArrowLeft, AlertTriangle, Activity, ChevronRight,
  Thermometer, Heart, Droplets, Weight, Phone,
} from 'lucide-react';

const EMPTY_VITALS = { bp: '', pulse: '', temp: '', spo2: '', weight: '' };

export default function ConsultationScreen() {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vitals');

  const [vitals, setVitals] = useState(EMPTY_VITALS);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyOfIllness, setHistoryOfIllness] = useState('');
  const [examinationNotes, setExaminationNotes] = useState('');

  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [queueEntry, setQueueEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  // AI diagnosis state (populated when doctor accepts from AIChat)
  const [acceptedDiagnosis, setAcceptedDiagnosis] = useState(null);

  // Patient listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'patients', patientId), (snap) => {
      if (snap.exists()) setPatient({ id: snap.id, ...snap.data() });
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [patientId]);

  // Load today's queue entry
  useEffect(() => {
    const loadQueue = async () => {
      const q = query(
        collection(db, 'queue'),
        where('patientId', '==', patientId),
        where('date', '==', todayString()),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const entry = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setQueueEntry(entry);
        if (entry.chiefComplaint) setChiefComplaint(entry.chiefComplaint);
      }
    };
    loadQueue();
  }, [patientId]);

  // Emergency flags
  useEffect(() => {
    const alerts = checkEmergencyFlags({ vitals, chiefComplaint, patient });
    setEmergencyAlerts(alerts);
    if (alerts.length > 0) setShowEmergencyModal(true);
  }, [vitals, chiefComplaint, patient]);

  const setVital = (key, val) => setVitals(v => ({ ...v, [key]: val }));

  // Called when doctor accepts AI diagnosis
  const handleDiagnosisAccepted = (diagResult) => {
    setAcceptedDiagnosis(diagResult);
    // Also pre-fill history from triage answers
    if (diagResult.triageAnswers && !historyOfIllness) {
      setHistoryOfIllness(diagResult.triageAnswers);
    }
  };

  const handleProceedToPrescription = async () => {
    if (!chiefComplaint.trim()) {
      toast.error('Chief complaint is required');
      setActiveTab('vitals');
      return;
    }
    setSaving(true);
    try {
      const today = todayString();
      const rxCountQ = query(collection(db, 'prescriptions'), where('date', '==', today));
      const rxCountSnap = await getDocs(rxCountQ);
      const rxId = generatePrescriptionId(rxCountSnap.size);

      const prescRef = await addDoc(collection(db, 'prescriptions'), {
        prescriptionId: rxId,
        patientId,
        queueId: queueEntry?.id || null,
        date: today,
        chiefComplaint: chiefComplaint.trim(),
        vitals,
        historyOfIllness: historyOfIllness.trim(),
        examinationNotes: examinationNotes.trim(),
        // Pre-fill from accepted AI diagnosis (if any)
        aiDiagnosis: acceptedDiagnosis?.provisionalDiagnosis || '',
        differentials: acceptedDiagnosis?.differentials || [],
        aiConfidence: acceptedDiagnosis?.confidence || '',
        finalDiagnosis: acceptedDiagnosis?.provisionalDiagnosis || '',
        investigations: [],
        medicines: [],
        advice: settings?.prescriptionFooter || '',
        followUpDate: '',
        followUpNotes: '',
        status: 'draft',
        createdAt: serverTimestamp(),
      });

      if (queueEntry?.id) {
        await updateDoc(doc(db, 'queue', queueEntry.id), { status: 'in-progress' });
      }

      await updateDoc(doc(db, 'patients', patientId), {
        lastVisit: serverTimestamp(),
        visitCount: (patient.visitCount || 0) + 1,
      });

      toast.success('Opening prescription...');
      navigate(`/prescription/${prescRef.id}`);
    } catch (err) {
      toast.error('Failed to save consultation');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #f3f4f6', borderTopColor: 'var(--navy)',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ flex: 1, padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Patient not found</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Emergency Modal */}
      {showEmergencyModal && emergencyAlerts.length > 0 && (
        <EmergencyModal alerts={emergencyAlerts} onClose={() => setShowEmergencyModal(false)} />
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        padding: '12px 20px 0', color: 'white', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button
            onClick={() => navigate(`/patients/${patientId}`)}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex',
            }}
          >
            <ArrowLeft size={18} color="white" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
              Consultation
            </h1>
            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 1 }}>
              {patient.name} · {formatAge(patient.age, patient.sex)}
            </p>
          </div>
          {emergencyAlerts.length > 0 && (
            <button
              onClick={() => setShowEmergencyModal(true)}
              style={{
                background: '#ef4444', border: 'none', borderRadius: 8,
                padding: '6px 10px', color: 'white',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                animation: 'pulse 1.5s infinite', fontFamily: 'var(--font-body)',
              }}
            >
              <AlertTriangle size={14} /> {emergencyAlerts.length} Alert
            </button>
          )}
        </div>

        {/* Patient alert strip */}
        {(patient.chronicConditions?.length > 0 || patient.allergies?.length > 0) && (
          <div style={{
            background: 'rgba(0,0,0,0.2)', borderRadius: 8,
            padding: '7px 12px', marginBottom: 10,
            display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          }}>
            {patient.allergies?.length > 0 && (
              <span style={{
                background: '#ef4444', color: 'white',
                borderRadius: 20, padding: '2px 10px',
                fontSize: 11, fontWeight: 700,
              }}>
                ⚠ {patient.allergies.join(', ')}
              </span>
            )}
            {patient.chronicConditions?.slice(0, 3).map(c => (
              <span key={c} style={{
                background: 'rgba(255,255,255,0.2)', color: 'white',
                borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
              }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* AI diagnosis accepted banner */}
        {acceptedDiagnosis && (
          <div style={{
            background: 'rgba(16,185,129,0.25)', borderRadius: 8,
            padding: '7px 12px', marginBottom: 10,
            fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600,
          }}>
            ✓ AI Diagnosis: {acceptedDiagnosis.provisionalDiagnosis}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {['vitals', 'ai', 'history', 'exam'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '3px solid white' : '3px solid transparent',
                color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                padding: '9px 0', cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {tab === 'vitals' ? 'Vitals' : tab === 'ai' ? '🤖 AI' : tab === 'history' ? 'History' : 'Exam'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px' }}>
        {activeTab === 'vitals' && (
          <VitalsTab
            vitals={vitals}
            setVital={setVital}
            chiefComplaint={chiefComplaint}
            setChiefComplaint={setChiefComplaint}
          />
        )}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!chiefComplaint.trim() && (
              <div style={{
                background: '#fef3c7', border: '1px solid #fde68a',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: '#92400e', fontFamily: 'var(--font-body)',
              }}>
                ⚠️ Please enter the Chief Complaint in the Vitals tab first
              </div>
            )}
            <AIChat
              chiefComplaint={chiefComplaint}
              patient={patient}
              vitals={vitals}
              examinationNotes={examinationNotes}
              onDiagnosisAccepted={handleDiagnosisAccepted}
              doctorName={settings?.doctorName}
              collapsed={!chiefComplaint.trim()}
            />
          </div>
        )}
        {activeTab === 'history' && (
          <HistoryTab
            historyOfIllness={historyOfIllness}
            setHistoryOfIllness={setHistoryOfIllness}
          />
        )}
        {activeTab === 'exam' && (
          <ExamTab
            examinationNotes={examinationNotes}
            setExaminationNotes={setExaminationNotes}
          />
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 68, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        padding: '12px 16px', background: 'white',
        borderTop: '1px solid #f3f4f6', zIndex: 100,
      }}>
        <button
          onClick={handleProceedToPrescription}
          disabled={saving}
          style={{
            width: '100%',
            background: saving ? '#e5e7eb' : 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
            color: saving ? '#9ca3af' : 'white',
            border: 'none', borderRadius: 10, padding: '14px',
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 12px rgba(15,76,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? 'Saving...' : (<>Write Prescription <ChevronRight size={16} /></>)}
        </button>
      </div>
    </div>
  );
}

// ── Vitals Tab ────────────────────────────────────────────────
function VitalsTab({ vitals, setVital, chiefComplaint, setChiefComplaint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardStyle}>
        <SectionTitle icon="🗣️" title="Chief Complaint *" />
        <textarea
          value={chiefComplaint}
          onChange={e => setChiefComplaint(e.target.value)}
          placeholder="e.g. Fever for 3 days with headache and body aches..."
          rows={3}
          style={{ ...inputStyle, resize: 'none', marginTop: 6 }}
        />
      </div>

      <div style={cardStyle}>
        <SectionTitle icon="📊" title="Vitals" />
        <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <VitalInput label="Blood Pressure" icon={<Activity size={13} />} value={vitals.bp} onChange={v => setVital('bp', v)} placeholder="120/80" hint="mmHg" />
          <VitalInput label="Pulse Rate"     icon={<Heart size={13} />}    value={vitals.pulse} onChange={v => setVital('pulse', v)} placeholder="72" hint="bpm" />
          <VitalInput label="Temperature"    icon={<Thermometer size={13} />} value={vitals.temp} onChange={v => setVital('temp', v)} placeholder="98.6" hint="°F" />
          <VitalInput label="SpO₂"           icon={<Droplets size={13} />} value={vitals.spo2} onChange={v => setVital('spo2', v)} placeholder="98" hint="%" />
          <VitalInput label="Weight"         icon={<Weight size={13} />}   value={vitals.weight} onChange={v => setVital('weight', v)} placeholder="65" hint="kg" />
        </div>
        <div style={{
          marginTop: 12, padding: '8px 10px', background: '#f8f9fc',
          borderRadius: 8, fontSize: 11, color: '#9ca3af', lineHeight: 1.7,
        }}>
          <strong style={{ color: '#6b7280' }}>Normal:</strong> BP 90/60–120/80 · Pulse 60–100 · Temp 97–99°F · SpO₂ ≥95%
        </div>
      </div>
    </div>
  );
}

function VitalInput({ label, icon, value, onChange, placeholder, hint }) {
  const isCritical = (() => {
    if (!value) return false;
    const v = parseFloat(value);
    if (label === 'SpO₂' && v < 90) return true;
    if (label === 'Pulse Rate' && (v < 40 || v > 150)) return true;
    if (label === 'Temperature' && v > 104) return true;
    return false;
  })();

  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: isCritical ? '#dc2626' : '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {icon} {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            borderColor: isCritical ? '#fca5a5' : '#e5e7eb',
            background: isCritical ? '#fff5f5' : 'white',
            paddingRight: 32,
          }}
        />
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9ca3af' }}>
          {hint}
        </span>
      </div>
      {isCritical && <p style={{ fontSize: 10, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>⚠ Critical</p>}
    </div>
  );
}

// ── History Tab ────────────────────────────────────────────────
function HistoryTab({ historyOfIllness, setHistoryOfIllness }) {
  const templates = [
    { label: 'Fever',       text: 'Fever for ___ days. Onset: sudden/gradual. Associated: headache, body ache, chills. No cough/rash.' },
    { label: 'Cough',       text: 'Cough for ___ days. Dry/productive. Sputum: ___. Associated: fever/dyspnea/chest pain.' },
    { label: 'Chest Pain',  text: 'Chest pain for ___. Character: sharp/dull/crushing. Radiation: jaw/left arm. Dyspnea/sweating: present/absent.' },
    { label: 'Abd. Pain',   text: 'Abdominal pain for ___. Site: ___. Nature: colicky/dull. N/V/D: present/absent.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {templates.map(t => (
          <button key={t.label} onClick={() => setHistoryOfIllness(p => p ? p + '\n' + t.text : t.text)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: 'white', fontSize: 12, fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + {t.label}
          </button>
        ))}
      </div>
      <div style={cardStyle}>
        <SectionTitle icon="📋" title="History of Present Illness" />
        <textarea value={historyOfIllness} onChange={e => setHistoryOfIllness(e.target.value)}
          placeholder="Detailed history..." rows={10}
          style={{ ...inputStyle, resize: 'vertical', marginTop: 8, minHeight: 200 }} />
      </div>
    </div>
  );
}

// ── Exam Tab ───────────────────────────────────────────────────
function ExamTab({ examinationNotes, setExaminationNotes }) {
  const templates = [
    { label: 'General',  text: 'Conscious, cooperative, not in acute distress. Not pale/icteric/cyanosed/edematous.' },
    { label: 'Chest',    text: 'Chest: symmetrical. Air entry: bilaterally equal. BS: vesicular. No added sounds.' },
    { label: 'Abdomen',  text: 'Abdomen: soft, non-tender. BS: present. No organomegaly.' },
    { label: 'CNS',      text: 'Conscious, oriented. No focal neurological deficit. Pupils: PEARL.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {templates.map(t => (
          <button key={t.label} onClick={() => setExaminationNotes(p => p ? p + '\n' + t.text : t.text)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: 'white', fontSize: 12, fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + {t.label}
          </button>
        ))}
      </div>
      <div style={cardStyle}>
        <SectionTitle icon="🔬" title="Clinical Examination" />
        <textarea value={examinationNotes} onChange={e => setExaminationNotes(e.target.value)}
          placeholder="Physical examination findings..." rows={10}
          style={{ ...inputStyle, resize: 'vertical', marginTop: 8, minHeight: 200 }} />
      </div>
    </div>
  );
}

// ── Emergency Modal ────────────────────────────────────────────
function EmergencyModal({ alerts, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', animation: 'slideUp 0.3s ease', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', padding: '20px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚨</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Emergency Alert</h2>
          <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Critical signs detected — immediate attention required</p>
        </div>
        <div style={{ padding: '16px 20px', maxHeight: 280, overflowY: 'auto' }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{alert.icon || '⚠️'}</span>
              <div>
                <p style={{ fontWeight: 700, color: '#991b1b', fontSize: 14 }}>{alert.title}</p>
                <p style={{ fontSize: 12, color: '#7f1d1d', marginTop: 3, lineHeight: 1.5 }}>{alert.message}</p>
                {alert.action && <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 6, textTransform: 'uppercase' }}>→ {alert.action}</p>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10 }}>
          <a href="tel:999" style={{ flex: 1, background: '#dc2626', color: 'white', borderRadius: 10, padding: '12px', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Phone size={15} /> Call 999
          </a>
          <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────────
function SectionTitle({ icon, title }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon} {title}
    </p>
  );
}

const cardStyle = {
  background: 'white', borderRadius: 16, padding: '14px 16px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6',
  animation: 'fadeIn 0.3s ease',
};

const inputStyle = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, fontFamily: 'var(--font-body)',
  color: '#1f2937', outline: 'none', background: 'white', boxSizing: 'border-box',
};
