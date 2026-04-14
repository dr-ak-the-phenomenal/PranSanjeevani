import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, RefreshCw, ChevronDown, ChevronUp, Cpu, Loader, X } from 'lucide-react';
import { getTriageQuestions, getFallbackQuestions, formatTriageAnswers } from '../ai/symptomTriage';
import { getDiagnosis, shouldEscalateToOpus } from '../ai/diagnosisEngine';
import toast from 'react-hot-toast';

// ─────────────────── Styles ──────────────────────────────────

const s = {
  container: {
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #f3f4f6',
    overflow: 'hidden',
    marginBottom: 0,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
    color: 'white', cursor: 'pointer',
  },
  headerTitle: {
    flex: 1, fontFamily: 'var(--font-display)',
    fontSize: 15, fontWeight: 700,
  },
  headerBadge: {
    fontSize: 11, padding: '2px 8px',
    background: 'rgba(255,255,255,0.25)',
    borderRadius: 20, fontFamily: 'var(--font-body)', fontWeight: 600,
  },
  body: { padding: '14px 16px' },
  step: { animation: 'fadeIn 0.3s ease' },

  // Triage questions
  questionCard: {
    background: '#f8f9fc', borderRadius: 12,
    padding: '12px 14px', marginBottom: 12,
  },
  questionText: {
    fontSize: 14, fontWeight: 600, color: '#1f2937',
    fontFamily: 'var(--font-body)', marginBottom: 8,
  },
  yesNoRow: { display: 'flex', gap: 8 },
  yesNoBtn: (selected) => ({
    flex: 1, padding: '9px',
    border: `1.5px solid ${selected ? 'var(--navy)' : '#e5e7eb'}`,
    borderRadius: 8, background: selected ? 'var(--navy)' : 'white',
    color: selected ? 'white' : '#6b7280',
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  }),
  textInput: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 13, fontFamily: 'var(--font-body)',
    color: '#1f2937', outline: 'none', background: 'white',
    boxSizing: 'border-box',
  },
  scaleRow: { display: 'flex', gap: 4 },
  scaleBtn: (selected) => ({
    flex: 1, padding: '8px 2px', fontSize: 12,
    border: `1.5px solid ${selected ? 'var(--navy)' : '#e5e7eb'}`,
    borderRadius: 6, background: selected ? 'var(--navy)' : 'white',
    color: selected ? 'white' : '#9ca3af',
    cursor: 'pointer', fontWeight: selected ? 700 : 400,
    fontFamily: 'var(--font-body)',
  }),
  choiceRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  choiceBtn: (selected) => ({
    padding: '7px 12px', fontSize: 12,
    border: `1.5px solid ${selected ? 'var(--navy)' : '#e5e7eb'}`,
    borderRadius: 20, background: selected ? 'rgba(15,76,129,0.1)' : 'white',
    color: selected ? 'var(--navy)' : '#6b7280',
    cursor: 'pointer', fontWeight: selected ? 700 : 400,
    fontFamily: 'var(--font-body)',
  }),

  // Buttons
  primaryBtn: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
    border: 'none', borderRadius: 10, cursor: 'pointer',
    color: 'white', fontFamily: 'var(--font-body)',
    fontSize: 14, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 4px 12px rgba(15,76,129,0.3)',
    marginTop: 4,
  },
  ghostBtn: {
    width: '100%', padding: '10px',
    border: '1.5px solid #e5e7eb', borderRadius: 10, cursor: 'pointer',
    color: '#6b7280', background: 'white',
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 8,
  },

  // Diagnosis result
  diagBox: {
    background: 'linear-gradient(135deg, rgba(15,76,129,0.04), rgba(26,107,181,0.06))',
    border: '1.5px solid rgba(15,76,129,0.15)',
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  diagTitle: {
    fontSize: 16, fontWeight: 700, color: '#1f2937',
    fontFamily: 'var(--font-body)', marginBottom: 6,
  },
  confidenceBadge: (level) => ({
    display: 'inline-block', padding: '2px 10px',
    borderRadius: 20, fontSize: 11, fontWeight: 700,
    fontFamily: 'var(--font-body)', marginBottom: 8,
    background: level === 'high' ? '#d1fae5' : level === 'medium' ? '#fef3c7' : '#fee2e2',
    color: level === 'high' ? '#065f46' : level === 'medium' ? '#92400e' : '#991b1b',
  }),
  modelBadge: {
    display: 'inline-block', padding: '2px 8px', marginLeft: 6,
    borderRadius: 20, fontSize: 10, fontWeight: 600,
    background: '#f3f4f6', color: '#6b7280',
    fontFamily: 'var(--font-body)',
  },
  differentialRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 0', borderTop: '1px dashed #f3f4f6',
    fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-body)',
  },
  redFlagBanner: {
    background: '#fee2e2', border: '1px solid #fca5a5',
    borderRadius: 10, padding: '8px 12px', marginBottom: 8,
    fontSize: 12, color: '#991b1b', fontFamily: 'var(--font-body)',
  },
  invSection: {
    marginTop: 10, padding: '10px 12px',
    background: '#f8f9fc', borderRadius: 10,
  },
  invLabel: {
    fontSize: 11, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    fontFamily: 'var(--font-body)', marginBottom: 6,
  },
  invList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  invChip: (essential) => ({
    fontSize: 11, padding: '3px 8px', borderRadius: 20,
    border: `1px solid ${essential ? 'rgba(15,76,129,0.3)' : '#e5e7eb'}`,
    background: essential ? 'rgba(15,76,129,0.08)' : 'white',
    color: essential ? 'var(--navy)' : '#9ca3af',
    fontFamily: 'var(--font-body)', fontWeight: essential ? 600 : 400,
  }),
  disclaimer: {
    fontSize: 11, color: '#9ca3af', fontStyle: 'italic',
    fontFamily: 'var(--font-body)', marginTop: 8, lineHeight: 1.5,
  },
  escalationNote: {
    fontSize: 11, color: '#7c3aed', fontWeight: 600,
    fontFamily: 'var(--font-body)', marginTop: 4,
  },
  spinner: {
    width: 18, height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};

// ─────────────────── Question renderers ──────────────────────

function QuestionInput({ question, value, onChange }) {
  const { type, text, options = [], placeholder } = question;

  return (
    <div style={s.questionCard}>
      <p style={s.questionText}>{text}</p>

      {type === 'yesno' && (
        <div style={s.yesNoRow}>
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              style={s.yesNoBtn(value === opt)}
              onClick={() => onChange(opt)}
            >
              {opt === 'Yes' ? '✓ Yes' : '✗ No'}
            </button>
          ))}
        </div>
      )}

      {type === 'text' && (
        <input
          style={s.textInput}
          placeholder={placeholder || 'Type your answer...'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {type === 'scale' && (
        <div style={s.scaleRow}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              style={s.scaleBtn(value === String(n))}
              onClick={() => onChange(String(n))}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {type === 'choice' && (
        <div style={s.choiceRow}>
          {options.map(opt => (
            <button
              key={opt}
              style={s.choiceBtn(value === opt)}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────── Diagnosis Result Display ─────────────────

function DiagnosisResult({ result, onAccept, onRetry, doctorName }) {
  const [showDiffs, setShowDiffs] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const modelLabel = result._escalatedFrom
    ? `Opus (escalated from ${result._escalatedFrom === 'claude-haiku-4-5-20251001' ? 'Haiku' : 'Sonnet'})`
    : result._modelUsed?.includes('opus') ? 'Opus'
    : result._modelUsed?.includes('sonnet') ? 'Sonnet'
    : result._modelUsed?.includes('haiku') ? 'Haiku'
    : 'AI';

  return (
    <div style={s.step}>
      {/* Emergency alert */}
      {result.emergencyAlert && (
        <div style={{
          background: '#dc2626', color: 'white', borderRadius: 10,
          padding: '10px 14px', marginBottom: 10, fontSize: 13,
          fontFamily: 'var(--font-body)', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          🚨 {result.emergencyMessage || 'Emergency — immediate attention required'}
        </div>
      )}

      {/* Red flags */}
      {result.redFlags?.length > 0 && (
        <div style={s.redFlagBanner}>
          ⚠️ <strong>Red flags:</strong> {result.redFlags.join(' · ')}
        </div>
      )}

      {/* Main diagnosis */}
      <div style={s.diagBox}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
          <span style={s.confidenceBadge(result.confidence)}>{result.confidence} confidence</span>
          <span style={s.modelBadge}>{modelLabel}</span>
        </div>
        <div style={s.diagTitle}>{result.provisionalDiagnosis}</div>

        {/* Differentials toggle */}
        {result.differentials?.length > 0 && (
          <>
            <button
              onClick={() => setShowDiffs(!showDiffs)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--navy)', fontFamily: 'var(--font-body)',
                fontWeight: 600, padding: '4px 0',
              }}
            >
              {showDiffs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {result.differentials.length} differentials
            </button>
            {showDiffs && result.differentials.map((d, i) => (
              <div key={i} style={s.differentialRow}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: d.likelihood === 'high' ? '#ef4444' : d.likelihood === 'medium' ? '#f59e0b' : '#10b981',
                }} />
                <span style={{ flex: 1 }}>{d.diagnosis}</span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{d.likelihood}</span>
              </div>
            ))}
          </>
        )}

        {/* Clinical reasoning toggle */}
        {result.clinicalReasoning && (
          <>
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-body)',
                fontWeight: 600, padding: '4px 0 0',
              }}
            >
              {showReasoning ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Clinical reasoning
            </button>
            {showReasoning && (
              <p style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-body)', marginTop: 4, lineHeight: 1.6 }}>
                {result.clinicalReasoning}
              </p>
            )}
          </>
        )}

        {result.seasonalNote && (
          <p style={{ fontSize: 12, color: '#0369a1', fontFamily: 'var(--font-body)', marginTop: 6 }}>
            🌧️ {result.seasonalNote}
          </p>
        )}

        {result._escalatedFrom && (
          <p style={s.escalationNote}>
            ⚡ Escalated to Opus for complex case
          </p>
        )}
      </div>

      {/* Investigations */}
      {(result.investigations?.essential?.length > 0 || result.investigations?.optional?.length > 0) && (
        <div style={s.invSection}>
          <div style={s.invLabel}>Suggested Investigations</div>
          <div style={s.invList}>
            {(result.investigations.essential || []).map(i => (
              <span key={i} style={s.invChip(true)}>{i}</span>
            ))}
            {(result.investigations.optional || []).map(i => (
              <span key={i} style={s.invChip(false)}>{i}</span>
            ))}
          </div>
        </div>
      )}

      <p style={s.disclaimer}>
        ⚕ AI-assisted suggestion. Final diagnosis is at the discretion of Dr. {doctorName || 'Anup Kumar Paul'}.
      </p>

      {/* Action buttons */}
      <button style={s.primaryBtn} onClick={() => onAccept(result)}>
        ✓ Use This Diagnosis
      </button>
      <button style={s.ghostBtn} onClick={onRetry}>
        <RefreshCw size={13} /> Try Again
      </button>
    </div>
  );
}

// ─────────────────── Main AIChat Component ────────────────────

const STAGES = {
  IDLE: 'idle',
  LOADING_QUESTIONS: 'loading_questions',
  ANSWERING: 'answering',
  LOADING_DIAGNOSIS: 'loading_diagnosis',
  RESULT: 'result',
};

export default function AIChat({
  chiefComplaint,
  patient,
  vitals,
  examinationNotes,
  onDiagnosisAccepted,
  doctorName,
  collapsed: initialCollapsed = false,
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [stage, setStage] = useState(STAGES.IDLE);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [urgencyHint, setUrgencyHint] = useState('routine');

  const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;

  const handleStartTriage = async () => {
    if (!chiefComplaint?.trim()) {
      toast.error('Enter chief complaint first');
      return;
    }
    setStage(STAGES.LOADING_QUESTIONS);
    setAnswers({});
    setResult(null);

    try {
      let triage;
      if (apiKey) {
        triage = await getTriageQuestions(chiefComplaint, patient?.age, apiKey);
      } else {
        triage = getFallbackQuestions(chiefComplaint);
      }
      setQuestions(triage.questions || []);
      setUrgencyHint(triage.urgencyHint || 'routine');
      setStage(STAGES.ANSWERING);
    } catch (err) {
      // Fallback to hardcoded questions
      const fallback = getFallbackQuestions(chiefComplaint);
      setQuestions(fallback.questions);
      setUrgencyHint(fallback.urgencyHint);
      setStage(STAGES.ANSWERING);
    }
  };

  const handleGetDiagnosis = async () => {
    setStage(STAGES.LOADING_DIAGNOSIS);
    const triageText = formatTriageAnswers(questions, answers);

    try {
      const diagnosis = await getDiagnosis({
        patientData: {
          age: patient?.age,
          sex: patient?.sex,
          chronicConditions: patient?.chronicConditions || [],
          allergies: patient?.allergies || [],
          currentMedications: patient?.currentMedications || [],
        },
        vitals: vitals || {},
        complaint: chiefComplaint,
        triageAnswers: triageText,
        examinationNotes: examinationNotes || '',
        apiKey,
      });
      setResult(diagnosis);
      setStage(STAGES.RESULT);
    } catch (err) {
      toast.error('AI diagnosis failed: ' + err.message);
      setStage(STAGES.ANSWERING);
    }
  };

  const handleAccept = (diagResult) => {
    onDiagnosisAccepted?.({
      provisionalDiagnosis: diagResult.provisionalDiagnosis,
      confidence: diagResult.confidence,
      differentials: diagResult.differentials || [],
      investigations: diagResult.investigations,
      redFlags: diagResult.redFlags || [],
      clinicalReasoning: diagResult.clinicalReasoning,
      triageAnswers: formatTriageAnswers(questions, answers),
    });
    setCollapsed(true);
    toast.success('AI diagnosis applied');
  };

  const handleReset = () => {
    setStage(STAGES.IDLE);
    setQuestions([]);
    setAnswers({});
    setResult(null);
  };

  const urgencyColor = urgencyHint === 'emergency' ? '#dc2626' : urgencyHint === 'urgent' ? '#f59e0b' : '#10b981';

  return (
    <div style={s.container}>
      {/* Header — always visible, toggles collapse */}
      <div style={s.header} onClick={() => setCollapsed(!collapsed)}>
        <MessageCircle size={16} />
        <span style={s.headerTitle}>AI Symptom Triage</span>
        {stage === STAGES.RESULT && (
          <span style={{ ...s.headerBadge, background: 'rgba(16,185,129,0.35)' }}>Done</span>
        )}
        {stage === STAGES.ANSWERING && (
          <span style={{ ...s.headerBadge, background: `rgba(${urgencyHint === 'emergency' ? '220,38,38' : '245,158,11'},0.35)` }}>
            {urgencyHint}
          </span>
        )}
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={s.body}>

          {/* IDLE — start button */}
          {stage === STAGES.IDLE && (
            <div style={s.step}>
              <p style={{ fontSize: 13, color: '#6b7280', fontFamily: 'var(--font-body)', marginBottom: 12, lineHeight: 1.6 }}>
                Let AI ask targeted follow-up questions, then generate a diagnosis with differentials and investigation suggestions.
              </p>
              {!apiKey && (
                <div style={{
                  background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
                  padding: '8px 10px', marginBottom: 10,
                  fontSize: 12, color: '#92400e', fontFamily: 'var(--font-body)',
                }}>
                  ⚠️ API key not set — will use offline fallback questions
                </div>
              )}
              <button style={s.primaryBtn} onClick={handleStartTriage}>
                <MessageCircle size={15} />
                Start Triage
              </button>
            </div>
          )}

          {/* LOADING QUESTIONS */}
          {stage === STAGES.LOADING_QUESTIONS && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 0' }}>
              <div style={{ ...s.spinner, borderColor: 'rgba(15,76,129,0.2)', borderTopColor: 'var(--navy)' }} />
              <span style={{ fontSize: 13, color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                Generating triage questions...
              </span>
            </div>
          )}

          {/* ANSWERING — questions form */}
          {stage === STAGES.ANSWERING && (
            <div style={s.step}>
              {questions.map(q => (
                <QuestionInput
                  key={q.id}
                  question={q}
                  value={answers[q.id] || ''}
                  onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                />
              ))}
              <button style={s.primaryBtn} onClick={handleGetDiagnosis}>
                <Cpu size={15} />
                Get AI Diagnosis
              </button>
              <button style={s.ghostBtn} onClick={handleReset}>
                <X size={13} /> Cancel
              </button>
            </div>
          )}

          {/* LOADING DIAGNOSIS */}
          {stage === STAGES.LOADING_DIAGNOSIS && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
              <div style={{ ...s.spinner, borderColor: 'rgba(15,76,129,0.2)', borderTopColor: 'var(--navy)', width: 24, height: 24 }} />
              <p style={{ fontSize: 14, color: 'var(--navy)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                Dr. Claude is thinking...
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'var(--font-body)' }}>
                Analysing patient data & Bangladesh disease patterns
              </p>
            </div>
          )}

          {/* RESULT */}
          {stage === STAGES.RESULT && result && (
            <DiagnosisResult
              result={result}
              onAccept={handleAccept}
              onRetry={() => setStage(STAGES.ANSWERING)}
              doctorName={doctorName}
            />
          )}

        </div>
      )}
    </div>
  );
}
