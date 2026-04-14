// ai/diagnosisEngine.js — Phase 4 full implementation
// Auto model selection: Haiku → Sonnet → Opus based on complexity

const SONNET_MODEL = 'claude-sonnet-4-6';
const OPUS_MODEL   = 'claude-opus-4-6';
const HAIKU_MODEL  = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are a clinical decision support AI for Dr. Anup Kumar Paul, MBBS, Ex-Lecturer of Pharmacology, DAMCH Faridpur, Bangladesh.

PATIENT DATA provided includes: Age, sex, chronic conditions, allergies, chief complaint, triage answers, vital signs, examination findings.

YOUR TASK:
1. Generate provisional diagnosis
2. List top 3-5 differentials with likelihood and reasoning
3. Suggest investigations (essential vs optional)
4. Flag any red flags or emergencies
5. Assess if escalation to Opus is needed

BANGLADESH CLINICAL CONTEXT:
- Seasonal: Dengue (Jun–Oct), Cholera (Mar–May), Typhoid (year-round)
- Common: TB, enteric fever, pneumonia, URTI, gastroenteritis, DM complications, HTN crisis
- Drug availability: local brands preferred, generic names essential
- Cost-aware: suggest affordable investigations first

OUTPUT FORMAT — strict JSON only, no preamble, no markdown:
{
  "provisionalDiagnosis": "string",
  "confidence": "low|medium|high",
  "differentials": [
    { "diagnosis": "string", "likelihood": "high|medium|low", "reasoning": "string" }
  ],
  "redFlags": ["string"],
  "emergencyAlert": false,
  "emergencyMessage": null,
  "investigations": {
    "essential": ["string"],
    "optional": ["string"]
  },
  "clinicalReasoning": "string",
  "escalateToOpus": false,
  "escalationReason": null,
  "seasonalNote": null,
  "managementHints": ["string"]
}`;

async function callClaude(model, userContent, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function buildUserContent({ patientData, vitals, complaint, triageAnswers, examinationNotes }) {
  return `Patient: ${patientData.age || '?'}y ${patientData.sex || '?'}
Chronic conditions: ${(patientData.chronicConditions || []).join(', ') || 'None'}
Allergies: ${(patientData.allergies || []).join(', ') || 'None'}
Current medications: ${(patientData.currentMedications || []).join(', ') || 'None'}
Chief complaint: ${complaint}
Triage answers: ${triageAnswers || 'Not collected'}
Vitals: BP ${vitals?.bp || '?'} | Pulse ${vitals?.pulse || '?'} bpm | Temp ${vitals?.temp || '?'}°F | SpO2 ${vitals?.spo2 || '?'}% | Weight ${vitals?.weight || '?'} kg
Examination: ${examinationNotes || 'Not documented'}`;
}

// ── Escalation logic ──────────────────────────────────────────

export function shouldEscalateToOpus(result, patientData) {
  if (result.escalateToOpus) return true;
  if (result.confidence === 'low') return true;
  if (result.emergencyAlert) return true;
  if ((patientData.chronicConditions || []).length >= 3) return true;

  // Similar top-2 differentials likelihood
  const diffs = result.differentials || [];
  if (diffs.length >= 2 &&
    diffs[0].likelihood === 'high' &&
    diffs[1].likelihood === 'high') return true;

  // Child <5 with danger signs
  if (patientData.age < 5 && result.redFlags?.length > 0) return true;

  // Immunocompromised
  const immuneConditions = ['CKD', 'Cancer', 'Liver Disease'];
  const hasImmune = (patientData.chronicConditions || []).some(c => immuneConditions.includes(c));
  if (hasImmune && result.confidence !== 'high') return true;

  return false;
}

// ── Main export ───────────────────────────────────────────────

export async function getDiagnosis({
  patientData, vitals, complaint, triageAnswers,
  examinationNotes = '', apiKey, forceModel = null,
}) {
  if (!apiKey) throw new Error('Claude API key not configured. Add REACT_APP_CLAUDE_API_KEY to .env');

  const userContent = buildUserContent({ patientData, vitals, complaint, triageAnswers, examinationNotes });

  // Step 1: Determine initial model
  const comorbidityCount = (patientData.chronicConditions || []).length;
  let model = forceModel;

  if (!model) {
    // Simple case → Haiku, complex → Sonnet (may escalate to Opus)
    const isSimple =
      comorbidityCount === 0 &&
      !complaint.toLowerCase().includes('chest') &&
      !complaint.toLowerCase().includes('stroke') &&
      !complaint.toLowerCase().includes('seizure');

    model = isSimple ? HAIKU_MODEL : SONNET_MODEL;
  }

  let result = await callClaude(model, userContent, apiKey);
  result._modelUsed = model;

  // Step 2: Auto-escalate to Opus if needed
  if (model !== OPUS_MODEL && shouldEscalateToOpus(result, patientData)) {
    const opusResult = await callClaude(OPUS_MODEL, userContent, apiKey);
    opusResult._modelUsed = OPUS_MODEL;
    opusResult._escalatedFrom = model;
    return opusResult;
  }

  return result;
}
