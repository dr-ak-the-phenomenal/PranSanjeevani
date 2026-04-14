// ai/symptomTriage.js
// Haiku-powered adaptive symptom triage
// Generates follow-up questions based on chief complaint

const TRIAGE_SYSTEM_PROMPT = `You are a clinical triage assistant for Dr. Anup Kumar Paul, MBBS, Bangladesh.

Given a patient's chief complaint, generate 3-5 focused follow-up questions to clarify the presentation.

Rules:
- Questions must be short, plain, easy to answer (Yes/No or short answer)
- Tailor questions to the complaint (fever → duration/pattern, chest pain → radiation/sweating)
- Bangladesh context: consider dengue, typhoid, malaria, enteric fever
- Output ONLY valid JSON, no preamble, no markdown

Output format:
{
  "questions": [
    { "id": "q1", "text": "How many days have you had this symptom?", "type": "text", "placeholder": "e.g. 3 days" },
    { "id": "q2", "text": "Do you have fever?", "type": "yesno" },
    { "id": "q3", "text": "Rate the severity (1–10)", "type": "scale" }
  ],
  "urgencyHint": "routine|urgent|emergency"
}

Types: "yesno", "text", "scale", "choice"
For "choice" type add: "options": ["option1", "option2", ...]`;

export async function getTriageQuestions(chiefComplaint, patientAge, apiKey) {
  if (!apiKey) throw new Error('API key not configured');

  const userMsg = `Patient age: ${patientAge || 'unknown'}\nChief complaint: ${chiefComplaint}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!response.ok) throw new Error(`Triage API error: ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Hardcoded fallback questions for common complaints (no API needed)
export function getFallbackQuestions(chiefComplaint) {
  const cc = (chiefComplaint || '').toLowerCase();

  if (cc.includes('fever')) {
    return {
      questions: [
        { id: 'q1', text: 'How many days have you had the fever?', type: 'text', placeholder: 'e.g. 3 days' },
        { id: 'q2', text: 'Is the fever continuous or does it come and go?', type: 'choice', options: ['Continuous', 'Comes and goes', 'Only at night'] },
        { id: 'q3', text: 'Do you have headache or body aches?', type: 'yesno' },
        { id: 'q4', text: 'Any rash, red spots, or bleeding from gums?', type: 'yesno' },
        { id: 'q5', text: 'Any cough, runny nose, or sore throat?', type: 'yesno' },
      ],
      urgencyHint: 'urgent',
    };
  }

  if (cc.includes('chest pain') || cc.includes('chest')) {
    return {
      questions: [
        { id: 'q1', text: 'How long have you had this chest pain?', type: 'text', placeholder: 'e.g. 30 minutes' },
        { id: 'q2', text: 'Does the pain spread to your arm, jaw, or back?', type: 'yesno' },
        { id: 'q3', text: 'Are you sweating or feeling breathless?', type: 'yesno' },
        { id: 'q4', text: 'Rate the pain severity (1 = mild, 10 = worst)', type: 'scale' },
        { id: 'q5', text: 'Does it get worse with physical activity?', type: 'yesno' },
      ],
      urgencyHint: 'emergency',
    };
  }

  if (cc.includes('cough')) {
    return {
      questions: [
        { id: 'q1', text: 'How long have you had this cough?', type: 'text', placeholder: 'e.g. 1 week' },
        { id: 'q2', text: 'Is it a dry cough or do you bring up phlegm?', type: 'choice', options: ['Dry', 'With phlegm', 'With blood'] },
        { id: 'q3', text: 'Do you have fever with the cough?', type: 'yesno' },
        { id: 'q4', text: 'Any shortness of breath or chest tightness?', type: 'yesno' },
      ],
      urgencyHint: 'routine',
    };
  }

  if (cc.includes('diarrhea') || cc.includes('loose') || cc.includes('gastro') || cc.includes('vomit')) {
    return {
      questions: [
        { id: 'q1', text: 'How many days has this been going on?', type: 'text', placeholder: 'e.g. 2 days' },
        { id: 'q2', text: 'How many times per day?', type: 'text', placeholder: 'e.g. 5–6 times' },
        { id: 'q3', text: 'Is there blood or mucus in the stool?', type: 'yesno' },
        { id: 'q4', text: 'Do you feel very weak or dizzy?', type: 'yesno' },
      ],
      urgencyHint: 'urgent',
    };
  }

  if (cc.includes('headache')) {
    return {
      questions: [
        { id: 'q1', text: 'How long have you had this headache?', type: 'text', placeholder: 'e.g. 2 days' },
        { id: 'q2', text: 'Where is the pain? (one side, both sides, back of head)', type: 'choice', options: ['One side', 'Both sides', 'Back of head', 'Whole head'] },
        { id: 'q3', text: 'Any fever, neck stiffness, or sensitivity to light?', type: 'yesno' },
        { id: 'q4', text: 'Rate the severity (1–10)', type: 'scale' },
      ],
      urgencyHint: 'routine',
    };
  }

  // Generic fallback
  return {
    questions: [
      { id: 'q1', text: 'How long have you had this problem?', type: 'text', placeholder: 'e.g. 3 days' },
      { id: 'q2', text: 'Is it getting better, worse, or staying the same?', type: 'choice', options: ['Getting better', 'Getting worse', 'Same'] },
      { id: 'q3', text: 'Do you have any fever?', type: 'yesno' },
      { id: 'q4', text: 'Rate how much it is bothering you (1–10)', type: 'scale' },
    ],
    urgencyHint: 'routine',
  };
}

export function formatTriageAnswers(questions, answers) {
  return questions
    .map(q => `${q.text}: ${answers[q.id] || 'Not answered'}`)
    .join('\n');
}
