import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../context/SettingsContext';
import { formatPrescriptionDate, generateBanglaInstructions } from '../utils/prescriptionPrint';
import DrugSearchModal from '../components/DrugSearchModal';
import { getDiagnosis } from '../ai/diagnosisEngine';
import {
  checkAllergies,
  checkDuplicateGeneric,
  checkDrugInteractions,
  getPregnancyCategory,
  getPediatricDoseNote,
  checkAntibioticStewardship,
  checkSteroidGuard,
  runAllSafetyChecks,
} from '../ai/drugSafety';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, X, Trash2, ChevronDown, ChevronUp,
  Cpu, CheckSquare, Square, Loader, Eye, Save,
  AlertTriangle, AlertCircle, Info, ShieldAlert,
} from 'lucide-react';

// ─────────────────── Constants ────────────────────────────────

const INVESTIGATION_LIST = [
  'CBC', 'Blood Sugar (F)', 'Blood Sugar (RBS)', 'HbA1c',
  'S. Creatinine', 'Urine R/E', 'ECG', 'Chest X-Ray',
  'Lipid Profile', 'LFT', 'TSH', 'Echo',
  'Urine C/S', 'Blood Culture', 'SGPT', 'S. Electrolytes',
];

const DOSE_STEPS = [0, 0.5, 1, 2];
const FOOD_OPTIONS = ['After food', 'Before food', 'With food', 'Empty stomach'];

// ─────────────────── Styles ────────────────────────────────────

const s = {
  screen: { flex: 1, overflowY: 'auto', paddingBottom: 100, background: '#f8f9fc' },
  header: {
    background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
    padding: '16px 20px', color: 'white',
    position: 'sticky', top: 0, zIndex: 50,
  },
  headerTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    border: 'none', background: 'rgba(255,255,255,0.18)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', flexShrink: 0,
  },
  headerTitle: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, flex: 1 },
  headerSub: { fontSize: 12, opacity: 0.8, fontFamily: 'var(--font-body)', marginLeft: 48 },
  section: {
    margin: '12px 16px 0', background: 'white',
    borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid #f3f4f6', gap: 8,
  },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--navy)', flex: 1 },
  sectionBody: { padding: '14px 16px' },
  label: {
    fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'var(--font-body)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block',
  },
  input: {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    fontSize: 14, fontFamily: 'var(--font-body)', color: '#1f2937',
    background: '#f8f9fc', outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    fontSize: 14, fontFamily: 'var(--font-body)', color: '#1f2937',
    background: '#f8f9fc', outline: 'none', resize: 'vertical',
    minHeight: 80, boxSizing: 'border-box',
  },
  aiBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    color: 'white', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
    boxShadow: '0 4px 12px rgba(15,76,129,0.3)', marginBottom: 14,
  },
  aiBox: {
    background: 'linear-gradient(135deg, rgba(15,76,129,0.04), rgba(26,107,181,0.06))',
    border: '1.5px solid rgba(15,76,129,0.15)',
    borderRadius: 12, padding: 14, marginBottom: 14,
  },
  confidenceBadge: (level) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-body)',
    background: level === 'high' ? '#d1fae5' : level === 'medium' ? '#fef3c7' : '#fee2e2',
    color: level === 'high' ? '#065f46' : level === 'medium' ? '#92400e' : '#991b1b',
  }),
  diagnosisText: { fontSize: 15, fontWeight: 700, color: '#1f2937', fontFamily: 'var(--font-body)', marginBottom: 8 },
  disclaimer: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', fontFamily: 'var(--font-body)', marginTop: 8 },
  differentialItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 0', borderTop: '1px dashed #f3f4f6',
    fontSize: 13, color: '#6b7280', fontFamily: 'var(--font-body)',
  },
  addMedBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '12px',
    border: '2px dashed #d1d5db', borderRadius: 12, cursor: 'pointer',
    background: 'transparent', color: 'var(--navy)',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, marginTop: 8,
  },
  medCard: { border: '1.5px solid #e5e7eb', borderRadius: 12, marginBottom: 10, overflow: 'hidden', background: 'white' },
  medCardHeader: {
    display: 'flex', alignItems: 'flex-start',
    padding: '12px 12px 10px', gap: 10,
    background: 'rgba(15,76,129,0.03)', borderBottom: '1px solid #f3f4f6',
  },
  medBrandName: { fontSize: 15, fontWeight: 700, color: '#1f2937', fontFamily: 'var(--font-body)' },
  medGeneric: { fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-body)', marginTop: 2 },
  medCardBody: { padding: '10px 12px' },
  doseRow: { display: 'flex', gap: 8, marginBottom: 10 },
  doseBtn: (active) => ({
    flex: 1, padding: '8px 4px',
    border: `1.5px solid ${active ? 'var(--navy)' : '#e5e7eb'}`,
    borderRadius: 8, background: active ? 'var(--navy)' : 'white',
    color: active ? 'white' : '#9ca3af',
    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', textAlign: 'center',
  }),
  doseVal: (val) => ({
    display: 'inline-block', minWidth: 24, textAlign: 'center',
    fontWeight: 700, fontSize: 13, color: val > 0 ? 'var(--navy)' : '#d1d5db',
  }),
  foodSelect: {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 13, fontFamily: 'var(--font-body)', color: '#374151',
    background: 'white', outline: 'none', cursor: 'pointer', appearance: 'none',
  },
  banglaText: {
    fontSize: 13, color: '#059669', fontFamily: 'var(--font-body)',
    marginTop: 8, padding: '6px 10px', background: '#f0fdf4',
    borderRadius: 8, lineHeight: 1.6,
  },
  removeBtn: {
    width: 28, height: 28, borderRadius: '50%',
    border: 'none', background: '#fee2e2', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ef4444', flexShrink: 0,
  },
  invGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' },
  invBadge: (selected) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 20,
    border: `1.5px solid ${selected ? 'var(--navy)' : '#e5e7eb'}`,
    background: selected ? 'rgba(15,76,129,0.08)' : 'white',
    color: selected ? 'var(--navy)' : '#6b7280',
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: selected ? 700 : 400, cursor: 'pointer',
  }),
  stickyBar: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, background: 'white',
    borderTop: '1px solid #e5e7eb', padding: '12px 16px',
    display: 'flex', gap: 10, boxSizing: 'border-box', zIndex: 40,
  },
  saveBtn: {
    flex: 1, padding: '13px', border: '1.5px solid var(--navy)', borderRadius: 12,
    background: 'white', color: 'var(--navy)', fontFamily: 'var(--font-body)',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  printBtn: {
    flex: 1, padding: '13px', border: 'none', borderRadius: 12,
    background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)', color: 'white',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: '0 4px 12px rgba(15,76,129,0.3)',
  },
};

// ─────────────────── Safety Banner ────────────────────────────

function SafetyBanner({ type, icon: Icon, message, onDismiss }) {
  const configs = {
    'hard-stop':    { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
    'cross':        { bg: '#fef3c7', border: '#fde047', color: '#713f12' },
    'duplicate':    { bg: '#fef9c3', border: '#fde047', color: '#713f12' },
    'major':        { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
    'moderate':     { bg: '#fff7ed', border: '#fed7aa', color: '#7c2d12' },
    'preg-x':       { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
    'preg-d':       { bg: '#fff7ed', border: '#fed7aa', color: '#7c2d12' },
    'preg-c':       { bg: '#fef3c7', border: '#fde047', color: '#713f12' },
    'pediatric':    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
    'antibiotic':   { bg: '#fef3c7', border: '#fde047', color: '#713f12' },
    'steroid':      { bg: '#fef3c7', border: '#fde047', color: '#713f12' },
  };
  const cfg = configs[type] || configs['antibiotic'];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
      borderRadius: 8, marginTop: 6,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
    }}>
      {Icon && <Icon size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span style={{ flex: 1 }}>{message}</span>
    </div>
  );
}

// ─────────────────── Pregnancy badge ─────────────────────────

function PregBadge({ category }) {
  if (!category || category === 'N') return null;
  const colors = {
    A: { bg: '#d1fae5', color: '#065f46' },
    B: { bg: '#dcfce7', color: '#14532d' },
    C: { bg: '#fef3c7', color: '#78350f' },
    D: { bg: '#fed7aa', color: '#7c2d12' },
    X: { bg: '#fee2e2', color: '#991b1b' },
  };
  const c = colors[category] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      ...c, fontSize: 11, fontWeight: 700, borderRadius: 6,
      padding: '2px 7px', fontFamily: 'var(--font-body)',
      letterSpacing: '0.02em',
    }}>
      Preg {category}
    </span>
  );
}

// ─────────────────── Medicine Card ────────────────────────────

function MedicineCard({ medicine, index, onChange, onRemove, patient, allMedicines }) {
  const bangla = generateBanglaInstructions(medicine);
  const patientAllergies = patient?.allergies || [];

  // Compute all safety checks for THIS medicine
  const otherMedicines = allMedicines.filter((_, i) => i !== index);
  const safety = runAllSafetyChecks(medicine, otherMedicines, {
    allergies: patientAllergies,
    chronicConditions: patient?.chronicConditions || [],
    age: patient?.age,
    sex: patient?.sex,
    weight: patient?.weight,
  });

  const showPregnancy = safety.pregnancyCategory !== null;
  const pregCat = safety.pregnancyCategory;
  const isXCategory = pregCat?.category === 'X';
  const [overriddenX, setOverriddenX] = useState(false);

  const cycleDose = (field) => {
    const cur = medicine[field] || 0;
    const idx = DOSE_STEPS.indexOf(cur);
    const next = DOSE_STEPS[(idx + 1) % DOSE_STEPS.length];
    onChange({ ...medicine, [field]: next });
  };

  // Hard-stop allergy: outline card in red
  const hasHardStop = safety.allergy.hit && safety.allergy.severity === 'hard-stop';
  const hasWarning = safety.allergy.hit && safety.allergy.severity === 'warning';

  return (
    <div style={{
      ...s.medCard,
      borderColor: hasHardStop ? '#fca5a5' : hasWarning ? '#fde047' : '#e5e7eb',
    }}>
      <div style={s.medCardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ ...s.medBrandName, color: hasHardStop ? '#991b1b' : '#1f2937' }}>
              {medicine.brandName}
            </div>
            {showPregnancy && pregCat && <PregBadge category={pregCat.category} />}
          </div>
          <div style={s.medGeneric}>
            {medicine.genericName}{medicine.strength ? ` · ${medicine.strength}` : ''}{medicine.dosageForm ? ` · ${medicine.dosageForm}` : ''}
          </div>
        </div>
        <button style={s.removeBtn} onClick={onRemove}><Trash2 size={13} /></button>
      </div>

      <div style={s.medCardBody}>
        {/* Dose toggles */}
        <div style={{ marginBottom: 10 }}>
          <span style={s.label}>Dose (tap to cycle: 0 → ½ → 1 → 2)</span>
          <div style={s.doseRow}>
            {['morning', 'afternoon', 'night'].map(t => (
              <button key={t} style={s.doseBtn(medicine[t] > 0)} onClick={() => cycleDose(t)}>
                <div style={{ fontSize: 11, marginBottom: 2, opacity: 0.75, textTransform: 'capitalize' }}>{t}</div>
                <span style={s.doseVal(medicine[t])}>{medicine[t] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration + Food */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <span style={s.label}>Duration</span>
            <input
              style={s.input}
              placeholder="e.g. 7 days"
              value={medicine.duration || ''}
              onChange={e => onChange({ ...medicine, duration: e.target.value })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={s.label}>Food</span>
            <select
              style={s.foodSelect}
              value={medicine.food || 'After food'}
              onChange={e => onChange({ ...medicine, food: e.target.value })}
            >
              {FOOD_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Bangla instructions */}
        {bangla && <div style={s.banglaText}>🇧🇩 {bangla}</div>}

        {/* ── Safety warnings ── */}

        {/* Hard-stop allergy */}
        {safety.allergy.hit && safety.allergy.severity === 'hard-stop' && (
          <SafetyBanner
            type="hard-stop"
            icon={AlertTriangle}
            message={`⛔ ALLERGY ALERT: Patient is allergic to ${safety.allergy.allergen}. This drug should NOT be prescribed.`}
          />
        )}

        {/* Cross-reactivity warning */}
        {safety.allergy.hit && safety.allergy.severity === 'warning' && (
          <SafetyBanner
            type="cross"
            icon={AlertTriangle}
            message={`⚠️ Cross-reactivity: Patient has allergy to ${safety.allergy.allergen} — possible cross-reaction with ${medicine.genericName}.`}
          />
        )}

        {/* Duplicate generic */}
        {safety.duplicate.duplicate && (
          <SafetyBanner
            type="duplicate"
            icon={AlertCircle}
            message={`Duplicate generic: ${medicine.genericName} is already added as ${safety.duplicate.existingBrand}.`}
          />
        )}

        {/* Drug interactions */}
        {safety.interactions.map((interaction, i) => (
          <SafetyBanner
            key={i}
            type={interaction.severity}
            icon={interaction.severity === 'major' ? ShieldAlert : AlertTriangle}
            message={`${interaction.severity === 'major' ? '🔴 Major interaction' : '🟠 Moderate interaction'}: ${interaction.drug1} + ${interaction.drug2} — ${interaction.description}`}
          />
        ))}

        {/* Pregnancy category */}
        {showPregnancy && pregCat && pregCat.category === 'X' && !overriddenX && (
          <div style={{
            padding: '10px 12px', borderRadius: 8, marginTop: 6,
            background: '#fee2e2', border: '1px solid #fca5a5',
            color: '#991b1b', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>⛔ CONTRAINDICATED IN PREGNANCY: {pregCat.label}</span>
            </div>
            <button
              onClick={() => setOverriddenX(true)}
              style={{
                padding: '5px 12px', borderRadius: 7, border: '1.5px solid #991b1b',
                background: 'transparent', color: '#991b1b', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700,
              }}
            >Override — confirm not pregnant</button>
          </div>
        )}
        {showPregnancy && pregCat && pregCat.category === 'D' && (
          <SafetyBanner type="preg-d" icon={AlertTriangle} message={`Pregnancy Cat D: ${pregCat.label}`} />
        )}
        {showPregnancy && pregCat && pregCat.category === 'C' && (
          <SafetyBanner type="preg-c" icon={Info} message={`Pregnancy Cat C: ${pregCat.label}`} />
        )}

        {/* Pediatric note */}
        {safety.pediatric && (
          <SafetyBanner type="pediatric" icon={Info} message={`👶 Pediatric: ${safety.pediatric}`} />
        )}

        {/* Antibiotic stewardship */}
        {safety.antibiotic?.warn && (
          <SafetyBanner type="antibiotic" icon={AlertCircle} message={`💊 Antibiotic stewardship: ${safety.antibiotic.message}`} />
        )}

        {/* Steroid guard */}
        {safety.steroid?.warn && safety.steroid.messages.map((msg, i) => (
          <SafetyBanner key={i} type="steroid" icon={AlertCircle} message={`💉 Steroid: ${msg}`} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────── Main Screen ──────────────────────────────

export default function PrescriptionScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [prescription, setPrescription] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [customInvestigation, setCustomInvestigation] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showDifferentials, setShowDifferentials] = useState(false);

  const [drugModalOpen, setDrugModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load prescription ──
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'prescriptions', id), async (snap) => {
      if (!snap.exists()) { toast.error('Prescription not found'); navigate(-1); return; }
      const data = { id: snap.id, ...snap.data() };
      setPrescription(data);
      setFinalDiagnosis(prev => prev || data.finalDiagnosis || '');
      setMedicines(prev => prev.length ? prev : (data.medicines || []));
      setInvestigations(prev => prev.length ? prev : (data.investigations || []));
      setAdvice(prev => prev || data.advice || settings?.prescriptionFooter || '');
      setFollowUpDate(prev => prev || data.followUpDate || '');
      setFollowUpNotes(prev => prev || data.followUpNotes || '');

      if (data.patientId && !patient) {
        try {
          const { doc: docFn, getDoc } = await import('firebase/firestore');
          const pSnap = await getDoc(docFn(db, 'patients', data.patientId));
          if (pSnap.exists()) setPatient({ id: pSnap.id, ...pSnap.data() });
        } catch (err) {
          console.error('Failed to load patient:', err);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error('Failed to load prescription');
      setLoading(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── AI Diagnosis ──
  const handleAIDiagnosis = async () => {
    const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
    if (!apiKey) { toast.error('Claude API key not configured in .env'); return; }
    if (!prescription?.chiefComplaint) { toast.error('Chief complaint required for AI diagnosis'); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await getDiagnosis({
        patientData: {
          age: patient?.age, sex: patient?.sex,
          chronicConditions: patient?.chronicConditions || [],
          allergies: patient?.allergies || [],
        },
        vitals: prescription?.vitals || {},
        complaint: prescription?.chiefComplaint || '',
        triageAnswers: prescription?.historyOfIllness || '',
        apiKey,
      });
      setAiResult(result);
      if (result.provisionalDiagnosis && !finalDiagnosis) {
        setFinalDiagnosis(result.provisionalDiagnosis);
      }
    } catch (err) {
      toast.error('AI diagnosis failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Add drug from modal ──
  const handleDrugSelect = useCallback((drug) => {
    // Check hard-stop allergy — show toast but still add (modal already gated it)
    const patientAllergies = patient?.allergies || [];
    const allergyCheck = checkAllergies(drug, patientAllergies);

    if (allergyCheck.hit && allergyCheck.severity === 'hard-stop' && !drug.allergyOverride) {
      toast.error(`⛔ Cannot add ${drug.genericName || drug.brandName} — allergy to ${allergyCheck.allergen}`);
      return;
    }

    const newMed = {
      ...drug,
      morning: 1, afternoon: 0, night: 1,
      food: 'After food', duration: '7 days',
    };

    setMedicines(prev => {
      const updated = [...prev, newMed];

      // Show interaction toasts for newly added drug
      const interactions = checkDrugInteractions(newMed, prev);
      interactions.forEach(interaction => {
        if (interaction.severity === 'major') {
          toast.error(`🔴 Major interaction: ${interaction.drug1} + ${interaction.drug2}`);
        } else {
          toast(`🟠 Moderate interaction: ${interaction.drug1} + ${interaction.drug2}`, { icon: '⚠️' });
        }
      });

      // Duplicate check
      const dupCheck = checkDuplicateGeneric(newMed, prev);
      if (dupCheck.duplicate) {
        toast(`Duplicate generic: ${newMed.genericName} already added as ${dupCheck.existingBrand}`, { icon: '⚠️' });
      }

      return updated;
    });
  }, [patient]);

  // ── Toggle investigation ──
  const toggleInvestigation = (inv) => {
    setInvestigations(prev => prev.includes(inv) ? prev.filter(i => i !== inv) : [...prev, inv]);
  };

  // ── Add custom investigation ──
  const addCustomInvestigation = () => {
    const val = customInvestigation.trim();
    if (!val) return;
    if (!investigations.includes(val)) setInvestigations(prev => [...prev, val]);
    setCustomInvestigation('');
  };

  // ── Save draft ──
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'prescriptions', id), {
        finalDiagnosis, medicines, investigations, advice,
        followUpDate, followUpNotes,
        aiDiagnosis: aiResult?.provisionalDiagnosis || prescription?.aiDiagnosis || '',
        differentials: aiResult?.differentials || prescription?.differentials || [],
        aiConfidence: aiResult?.confidence || prescription?.aiConfidence || '',
        updatedAt: serverTimestamp(),
      });
      toast.success('Prescription saved!');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleViewPrint = async () => {
    await handleSave();
    navigate(`/prescription/view/${id}`);
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={28} color="var(--navy)" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  const patientAllergies = patient?.allergies || [];

  return (
    <>
      <div style={s.screen}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerTop}>
            <button style={s.backBtn} onClick={() => navigate(`/patients/${prescription?.patientId}`)}>
              <ArrowLeft size={18} />
            </button>
            <div style={s.headerTitle}>Write Prescription</div>
          </div>
          <div style={s.headerSub}>
            {patient ? `${patient.name} · ${patient.age}y ${patient.sex}` : '—'}
            &nbsp;&nbsp;·&nbsp;&nbsp;
            Rx# {prescription?.prescriptionId || id?.slice(-8)}
          </div>
        </div>

        {/* ── AI Diagnosis ── */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <Cpu size={18} color="var(--navy)" />
            <span style={s.sectionTitle}>Diagnosis</span>
          </div>
          <div style={s.sectionBody}>
            <button
              style={{ ...s.aiBtn, opacity: aiLoading ? 0.7 : 1 }}
              onClick={handleAIDiagnosis}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <><Loader size={16} style={{ animation: 'spin 0.7s linear infinite' }} />Dr. Claude is thinking...</>
              ) : (
                <><Cpu size={16} />Get AI Diagnosis</>
              )}
            </button>

            {aiResult && (
              <div style={s.aiBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={s.diagnosisText}>{aiResult.provisionalDiagnosis}</span>
                  <span style={s.confidenceBadge(aiResult.confidence)}>{aiResult.confidence}</span>
                </div>
                {aiResult.differentials?.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowDifferentials(!showDifferentials)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 12, color: 'var(--navy)', fontFamily: 'var(--font-body)',
                        fontWeight: 600, padding: 0, marginBottom: 4,
                      }}
                    >
                      {showDifferentials ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {aiResult.differentials.length} differentials
                    </button>
                    {showDifferentials && aiResult.differentials.map((d, i) => (
                      <div key={i} style={s.differentialItem}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: d.likelihood === 'high' ? '#ef4444' : d.likelihood === 'medium' ? '#f59e0b' : '#10b981',
                        }} />
                        <span>{d.diagnosis}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>{d.likelihood}</span>
                      </div>
                    ))}
                  </>
                )}
                <p style={s.disclaimer}>
                  ⚕ AI-assisted suggestion. Final diagnosis is at the discretion of Dr. {settings?.doctorName || 'Anup Kumar Paul'}.
                </p>
              </div>
            )}

            <span style={s.label}>Final Diagnosis *</span>
            <input
              style={s.input}
              placeholder="Type confirmed diagnosis..."
              value={finalDiagnosis}
              onChange={e => setFinalDiagnosis(e.target.value)}
            />
          </div>
        </div>

        {/* ── Medicines ── */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={{ fontSize: 18 }}>💊</span>
            <span style={s.sectionTitle}>Medicines</span>
            <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'var(--font-body)' }}>
              {medicines.length} added
            </span>
          </div>
          <div style={s.sectionBody}>
            {medicines.map((med, idx) => (
              <MedicineCard
                key={idx}
                index={idx}
                medicine={med}
                patient={patient}
                allMedicines={medicines}
                onChange={updated => setMedicines(prev => prev.map((m, i) => i === idx ? updated : m))}
                onRemove={() => setMedicines(prev => prev.filter((_, i) => i !== idx))}
              />
            ))}
            <button style={s.addMedBtn} onClick={() => setDrugModalOpen(true)}>
              <Plus size={16} />Add Medicine
            </button>
          </div>
        </div>

        {/* ── Investigations ── */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={{ fontSize: 18 }}>🔬</span>
            <span style={s.sectionTitle}>Investigations</span>
          </div>
          <div style={s.sectionBody}>
            <div style={s.invGrid}>
              {INVESTIGATION_LIST.map(inv => {
                const sel = investigations.includes(inv);
                return (
                  <button key={inv} style={s.invBadge(sel)} onClick={() => toggleInvestigation(inv)}>
                    {sel ? <CheckSquare size={13} /> : <Square size={13} />}
                    {inv}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Custom test..."
                value={customInvestigation}
                onChange={e => setCustomInvestigation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomInvestigation()}
              />
              <button
                style={{
                  padding: '0 16px', borderRadius: 10,
                  border: '1.5px solid var(--navy)', background: 'white',
                  color: 'var(--navy)', cursor: 'pointer', fontWeight: 700,
                  fontSize: 14, fontFamily: 'var(--font-body)',
                }}
                onClick={addCustomInvestigation}
              >Add</button>
            </div>
            {investigations.filter(i => !INVESTIGATION_LIST.includes(i)).map(inv => (
              <span key={inv} style={{ ...s.invBadge(true), marginTop: 8, display: 'inline-flex', cursor: 'default' }}>
                <CheckSquare size={13} />
                {inv}
                <X size={12} style={{ marginLeft: 4, cursor: 'pointer' }}
                  onClick={() => setInvestigations(prev => prev.filter(i => i !== inv))} />
              </span>
            ))}
          </div>
        </div>

        {/* ── Advice & Follow-up ── */}
        <div style={{ ...s.section, marginBottom: 16 }}>
          <div style={s.sectionHeader}>
            <span style={{ fontSize: 18 }}>📝</span>
            <span style={s.sectionTitle}>Advice & Follow-up</span>
          </div>
          <div style={s.sectionBody}>
            <span style={s.label}>Advice / Instructions</span>
            <textarea
              style={s.textarea}
              placeholder="General advice for patient..."
              value={advice}
              onChange={e => setAdvice(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={s.label}>Follow-up Date</span>
                <input
                  type="date" style={s.input}
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={s.label}>Follow-up Notes</span>
                <input
                  style={s.input} placeholder="e.g. Repeat CBC"
                  value={followUpNotes}
                  onChange={e => setFollowUpNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div style={s.stickyBar}>
        <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? <Loader size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={15} />}
          Save Draft
        </button>
        <button style={{ ...s.printBtn, opacity: saving ? 0.6 : 1 }} onClick={handleViewPrint} disabled={saving}>
          <Eye size={15} />View & Print
        </button>
      </div>

      {/* Drug search modal — passes allergy and age context */}
      <DrugSearchModal
        isOpen={drugModalOpen}
        onClose={() => setDrugModalOpen(false)}
        onSelect={handleDrugSelect}
        patientAllergies={patientAllergies}
        patientAge={patient?.age ?? null}
        patientSex={patient?.sex}
      />
    </>
  );
}
