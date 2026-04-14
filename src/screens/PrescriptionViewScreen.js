import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../context/SettingsContext';
import {
  generateBanglaInstructions,
  generateWhatsAppText,
  formatPrescriptionDate,
  shareOnWhatsApp,
} from '../utils/prescriptionPrint';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, Share2, Loader } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Print styles injected into <head> once
// ─────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { margin: 0; padding: 0; background: white; }
  .rx-card {
    box-shadow: none !important;
    border: none !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 12mm 16mm !important;
    border-radius: 0 !important;
  }
  @page { margin: 8mm; }
}
`;

function injectPrintStyles() {
  if (document.getElementById('rx-print-style')) return;
  const style = document.createElement('style');
  style.id = 'rx-print-style';
  style.textContent = PRINT_STYLE;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const s = {
  screen: { flex: 1, overflowY: 'auto', background: '#f8f9fc', paddingBottom: 100 },
  actionBar: {
    background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
    padding: '14px 20px',
    display: 'flex', alignItems: 'center', gap: 10,
    position: 'sticky', top: 0, zIndex: 50,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    border: 'none', background: 'rgba(255,255,255,0.18)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white',
  },
  actionTitle: {
    flex: 1, color: 'white',
    fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
  },
  iconBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.12)',
    color: 'white', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
  },
  cardWrap: { padding: '16px 12px' },
  rxCard: {
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    maxWidth: 480, margin: '0 auto',
  },
  // Letterhead
  lhTop: {
    background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
    padding: '20px 20px 16px',
    color: 'white',
    display: 'flex', alignItems: 'flex-start', gap: 14,
  },
  lhIcon: { fontSize: 28, marginTop: 2, flexShrink: 0 },
  lhDoctorName: {
    fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  lhDegree: { fontSize: 13, opacity: 0.9, marginTop: 2, fontFamily: 'var(--font-body)' },
  lhInstitution: { fontSize: 12, opacity: 0.75, marginTop: 1, fontFamily: 'var(--font-body)' },
  lhBmdc: { fontSize: 12, opacity: 0.75, fontFamily: 'var(--font-body)' },

  chamberBar: {
    background: 'rgba(15,76,129,0.06)',
    padding: '10px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  chamberText: {
    fontSize: 13, color: '#374151', fontFamily: 'var(--font-body)',
  },

  patientRow: {
    display: 'flex', flexWrap: 'wrap', gap: 10,
    padding: '12px 20px', borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
  },
  metaChip: {
    fontSize: 13, color: '#374151', fontFamily: 'var(--font-body)',
  },
  diagnosisRow: {
    padding: '10px 20px 14px', borderBottom: '2px solid #e5e7eb',
  },
  diagnosisLabel: {
    fontSize: 11, fontWeight: 700, color: '#9ca3af',
    fontFamily: 'var(--font-body)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 4,
  },
  diagnosisText: {
    fontSize: 15, fontWeight: 700, color: '#1f2937',
    fontFamily: 'var(--font-body)',
  },

  rxSymbol: {
    fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
    color: 'var(--navy)', padding: '14px 20px 4px',
    fontStyle: 'italic',
  },
  medItem: {
    padding: '10px 20px 12px',
    borderBottom: '1px dashed #f3f4f6',
  },
  medNumber: {
    fontSize: 12, fontWeight: 700, color: 'var(--navy)',
    fontFamily: 'var(--font-body)',
  },
  medBrand: {
    fontSize: 15, fontWeight: 700, color: '#1f2937',
    fontFamily: 'var(--font-body)',
  },
  medGenericLine: {
    fontSize: 12, color: '#6b7280',
    fontFamily: 'var(--font-body)', marginTop: 1,
  },
  medDoseLine: {
    fontSize: 13, color: '#374151',
    fontFamily: 'var(--font-body)', marginTop: 4,
  },
  banglaLine: {
    fontSize: 13, color: '#059669',
    fontFamily: 'var(--font-body)', marginTop: 3,
  },

  invSection: {
    padding: '12px 20px 14px', borderTop: '2px solid #e5e7eb',
  },
  invLabel: {
    fontSize: 12, fontWeight: 700, color: '#9ca3af',
    fontFamily: 'var(--font-body)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 8,
  },
  invList: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  invChip: {
    fontSize: 12, padding: '4px 10px',
    border: '1px solid #d1d5db', borderRadius: 20,
    color: '#374151', fontFamily: 'var(--font-body)',
    background: '#f9fafb',
  },

  adviceSection: {
    padding: '12px 20px 14px', borderTop: '1px solid #f3f4f6',
  },
  adviceLabel: {
    fontSize: 12, fontWeight: 700, color: '#9ca3af',
    fontFamily: 'var(--font-body)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 6,
  },
  adviceText: {
    fontSize: 13, color: '#374151', fontFamily: 'var(--font-body)',
    lineHeight: 1.6,
  },

  footer: {
    background: 'rgba(15,76,129,0.04)',
    padding: '10px 20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 11, color: '#9ca3af', fontStyle: 'italic',
    fontFamily: 'var(--font-body)',
  },
  sigArea: {
    fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-display)',
    textAlign: 'right',
  },
};

function DoseDisplay({ medicine }) {
  const { morning = 0, afternoon = 0, night = 0, food = 'After food', duration = '' } = medicine;
  const parts = [];
  if (morning)   parts.push({ label: 'Morning', val: morning, active: true });
  else           parts.push({ label: 'Morning', val: 0, active: false });
  if (afternoon) parts.push({ label: 'Afternoon', val: afternoon, active: true });
  else           parts.push({ label: 'Afternoon', val: 0, active: false });
  if (night)     parts.push({ label: 'Night', val: night, active: true });
  else           parts.push({ label: 'Night', val: 0, active: false });

  return (
    <div style={s.medDoseLine}>
      {parts.map((p, i) => (
        <span key={i} style={{ marginRight: 8, color: p.active ? '#1f2937' : '#d1d5db' }}>
          {p.active ? '●' : '○'} {p.label}{p.active && p.val !== 1 ? ` ×${p.val}` : ''}
        </span>
      ))}
      {duration && <span> | {duration}</span>}
      {food && <span> — {food}</span>}
    </div>
  );
}

export default function PrescriptionViewScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [prescription, setPrescription] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { injectPrintStyles(); }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'prescriptions', id));
        if (!snap.exists()) { toast.error('Prescription not found'); return; }
        const data = { id: snap.id, ...snap.data() };
        setPrescription(data);

        if (data.patientId) {
          const pSnap = await getDoc(doc(db, 'patients', data.patientId));
          if (pSnap.exists()) setPatient({ id: pSnap.id, ...pSnap.data() });
        }
      } catch (err) {
        toast.error('Failed to load: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleShare = () => {
    if (!prescription) return;
    const text = generateWhatsAppText(prescription, settings, patient?.name);
    shareOnWhatsApp(text);
  };

  const handlePrint = () => window.print();

  const goBack = () => navigate(`/prescription/${id}`);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={28} color="var(--navy)" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (!prescription) return null;

  const doc2 = settings || {};
  const meds = prescription.medicines || [];
  const invs = prescription.investigations || [];

  return (
    <div style={s.screen}>
      {/* Action bar — hidden on print */}
      <div style={s.actionBar} className="no-print">
        <button style={s.backBtn} onClick={goBack}>
          <ArrowLeft size={18} />
        </button>
        <span style={s.actionTitle}>Prescription</span>
        <button style={s.iconBtn} onClick={handleShare}>
          <Share2 size={14} />
          WhatsApp
        </button>
        <button style={s.iconBtn} onClick={handlePrint}>
          <Printer size={14} />
          Print
        </button>
      </div>

      <div style={s.cardWrap}>
        <div style={s.rxCard} className="rx-card">

          {/* ── Letterhead ── */}
          <div style={s.lhTop}>
            <div style={s.lhIcon}>⚕️</div>
            <div>
              <div style={s.lhDoctorName}>{doc2.doctorName || 'Dr. Anup Kumar Paul'}</div>
              <div style={s.lhDegree}>{doc2.degrees || 'MBBS (Dhaka)'}</div>
              {doc2.showInstitution !== false && doc2.designation && (
                <div style={s.lhInstitution}>{doc2.designation}{doc2.institution ? `, ${doc2.institution}` : ''}</div>
              )}
              {doc2.showBMDC !== false && doc2.bmdc && (
                <div style={s.lhBmdc}>BM&DC Reg No: {doc2.bmdc}</div>
              )}
            </div>
          </div>

          {/* Chamber info */}
          <div style={s.chamberBar}>
            <div style={s.chamberText}>
              📍 {doc2.chamberName || '—'}
            </div>
            {doc2.chamberAddress && (
              <div style={{ ...s.chamberText, fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {doc2.chamberAddress}
              </div>
            )}
            {doc2.phone && (
              <div style={{ ...s.chamberText, fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                📞 {doc2.phone}
              </div>
            )}
          </div>

          {/* Patient info row */}
          <div style={s.patientRow}>
            <span style={{ ...s.metaChip, fontWeight: 700, color: 'var(--navy)' }}>
              📅 {formatPrescriptionDate(prescription.date || new Date().toISOString().slice(0,10))}
            </span>
            <span style={{ ...s.metaChip, color: '#9ca3af' }}>|</span>
            <span style={{ ...s.metaChip, fontSize: 12 }}>
              Rx# {prescription.prescriptionId || id?.slice(-8)}
            </span>
            {patient && (
              <>
                <span style={{ ...s.metaChip, color: '#9ca3af' }}>|</span>
                <span style={{ ...s.metaChip, fontWeight: 600 }}>{patient.name}</span>
                <span style={{ ...s.metaChip, fontSize: 12, color: '#6b7280' }}>
                  {patient.age}y / {patient.sex}
                </span>
              </>
            )}
          </div>

          {/* Diagnosis */}
          {prescription.finalDiagnosis && (
            <div style={s.diagnosisRow}>
              <div style={s.diagnosisLabel}>Diagnosis</div>
              <div style={s.diagnosisText}>{prescription.finalDiagnosis}</div>
            </div>
          )}

          {/* Rx symbol */}
          {meds.length > 0 && (
            <>
              <div style={s.rxSymbol}>℞</div>
              {meds.map((med, idx) => {
                const bangla = generateBanglaInstructions(med);
                return (
                  <div key={idx} style={s.medItem}>
                    <span style={s.medNumber}>{idx + 1}.</span>{' '}
                    <span style={s.medBrand}>{med.brandName}</span>{' '}
                    <span style={{ fontSize: 13, color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                      {med.strength} {med.dosageForm}
                    </span>
                    <div style={s.medGenericLine}>{med.genericName}</div>
                    <DoseDisplay medicine={med} />
                    {bangla && <div style={s.banglaLine}>🇧🇩 {bangla}</div>}
                  </div>
                );
              })}
            </>
          )}

          {/* Investigations */}
          {invs.length > 0 && (
            <div style={s.invSection}>
              <div style={s.invLabel}>Investigations</div>
              <div style={s.invList}>
                {invs.map(inv => (
                  <span key={inv} style={s.invChip}>□ {inv}</span>
                ))}
              </div>
            </div>
          )}

          {/* Advice */}
          {(prescription.advice || prescription.followUpDate) && (
            <div style={s.adviceSection}>
              {prescription.advice && (
                <>
                  <div style={s.adviceLabel}>Advice</div>
                  <div style={s.adviceText}>{prescription.advice}</div>
                </>
              )}
              {prescription.followUpDate && (
                <div style={{ ...s.adviceText, marginTop: 8, fontWeight: 600 }}>
                  📅 Follow-up: {formatPrescriptionDate(prescription.followUpDate)}
                  {prescription.followUpNotes && ` — ${prescription.followUpNotes}`}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={s.footer}>
            <span style={s.footerText}>⚕ AI-assisted — Verified by Doctor</span>
            <div style={s.sigArea}>
              <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 2 }}>_____________</div>
              <div style={{ fontSize: 12 }}>{doc2.doctorName || 'Dr. Anup Kumar Paul'}</div>
              {doc2.bmdc && <div style={{ fontSize: 11, color: '#9ca3af' }}>BM&DC: {doc2.bmdc}</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
