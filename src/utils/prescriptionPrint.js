// utils/prescriptionPrint.js
// Updated in Phase 3 — Bangla instructions, WhatsApp formatter, print helpers

// ─────────────────────────────────────────────────────────────
// Bangla dose instruction generator (pure JS — never calls AI)
// ─────────────────────────────────────────────────────────────

const BANGLA_DOSE = {
  0.5: 'আধটি',
  1:   '১টি',
  2:   '২টি',
  3:   '৩টি',
};

const BANGLA_FOOD = {
  'After food':    'খাওয়ার পরে',
  'Before food':   'খাওয়ার আগে',
  'With food':     'খাওয়ার সাথে',
  'Empty stomach': 'খালি পেটে',
};

export function generateBanglaInstructions(medicine) {
  const { morning = 0, afternoon = 0, night = 0, food = 'After food', duration = '' } = medicine;

  const parts = [];
  if (morning && BANGLA_DOSE[morning])     parts.push(`সকাল ${BANGLA_DOSE[morning]}`);
  if (afternoon && BANGLA_DOSE[afternoon]) parts.push(`দুপুর ${BANGLA_DOSE[afternoon]}`);
  if (night && BANGLA_DOSE[night])         parts.push(`রাত ${BANGLA_DOSE[night]}`);

  if (!parts.length) return '';

  const doseStr = parts.join(' + ');
  const foodStr = BANGLA_FOOD[food] || 'খাওয়ার পরে';
  const durStr  = duration ? `, ${duration}` : '';

  return `${doseStr} — ${foodStr}${durStr}`;
}

export function generateEnglishInstructions(medicine) {
  const { morning = 0, afternoon = 0, night = 0, food = 'After food', duration = '' } = medicine;
  const parts = [];
  if (morning)   parts.push(`Morning×${morning}`);
  if (afternoon) parts.push(`Afternoon×${afternoon}`);
  if (night)     parts.push(`Night×${night}`);
  if (!parts.length) return duration ? duration : '';
  const doseStr = parts.join(' + ');
  const durStr  = duration ? ` — ${duration}` : '';
  return `${doseStr}${durStr} (${food})`;
}

export function formatPrescriptionDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

export function generateWhatsAppText(prescription, settings, patientName) {
  const {
    prescriptionId, date, finalDiagnosis,
    medicines = [], investigations = [],
    advice, followUpDate, followUpNotes,
  } = prescription;

  const doc = settings || {};
  const lines = [];

  lines.push(`*${doc.doctorName || 'Dr. Anup Kumar Paul'}*`);
  lines.push(`${doc.degrees || 'MBBS (Dhaka)'}`);
  if (doc.showInstitution && doc.designation && doc.institution) {
    lines.push(`${doc.designation}, ${doc.institution}`);
  }
  if (doc.showBMDC !== false && doc.bmdc) {
    lines.push(`BM&DC Reg: ${doc.bmdc}`);
  }
  if (doc.chamberName) lines.push(`📍 ${doc.chamberName}`);
  lines.push(`📅 ${formatPrescriptionDate(date)}   Rx# ${prescriptionId || ''}`);
  lines.push('');

  if (patientName) lines.push(`*Patient:* ${patientName}`);
  if (finalDiagnosis) lines.push(`*Diagnosis:* ${finalDiagnosis}`);
  lines.push('');

  if (medicines.length > 0) {
    lines.push('*Rx:*');
    medicines.forEach((m, i) => {
      const bangla = generateBanglaInstructions(m);
      lines.push(`${i + 1}. *${m.brandName}* ${m.strength || ''} (${m.dosageForm || ''})`);
      lines.push(`   ${m.genericName || ''}`);
      if (bangla) lines.push(`   🇧🇩 ${bangla}`);
      if (m.duration) lines.push(`   ⏱ ${m.duration}`);
    });
    lines.push('');
  }

  if (investigations.length > 0) {
    lines.push(`*Investigations:* ${investigations.join(', ')}`);
    lines.push('');
  }

  if (advice) lines.push(`*Advice:* ${advice}`);

  if (followUpDate) {
    lines.push(`*Follow-up:* ${formatPrescriptionDate(followUpDate)}${followUpNotes ? ` — ${followUpNotes}` : ''}`);
  }

  lines.push('');
  lines.push(`_⚕ AI-assisted prescription — Verified by Doctor_`);

  return lines.join('\n');
}

export function shareOnWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

export function printPrescription() {
  window.print();
}

// Legacy aliases
export function buildWhatsAppText(prescription, settings) {
  return generateWhatsAppText(prescription, settings, prescription.patient?.name);
}

export function buildDoseString(medicine) {
  return generateEnglishInstructions(medicine);
}
