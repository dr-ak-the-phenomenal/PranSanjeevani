// ai/safetyRules.js
// Hardcoded emergency safety checks — NOT AI-dependent
// Phase 5 update: added checkVitalsTrend()

export const EMERGENCY_THRESHOLDS = {
  tempFever: 103,       // °F
  spo2Low: 90,          // %
  sbpCrisis: 180,       // mmHg
  dbpCrisis: 120,       // mmHg
};

export function checkVitalEmergencies(vitals) {
  const alerts = [];
  if (!vitals) return alerts;
  const { temp, spo2, bpSystolic, bpDiastolic } = vitals;
  if (temp && parseFloat(temp) > EMERGENCY_THRESHOLDS.tempFever) {
    alerts.push({ level: 'warning', icon: '🌡️', title: 'High Fever Alert', message: `Temperature ${temp}°F is above 103°F. Consider antipyretics, cooling measures, and CBC/malaria screening.` });
  }
  if (spo2 && parseFloat(spo2) < EMERGENCY_THRESHOLDS.spo2Low) {
    alerts.push({ level: 'emergency', icon: '🫁', title: 'Critical SpO2', message: `SpO2 ${spo2}% is critically low. Immediate oxygen therapy required. Consider emergency referral.` });
  }
  if (bpSystolic && bpDiastolic && (parseFloat(bpSystolic) >= EMERGENCY_THRESHOLDS.sbpCrisis || parseFloat(bpDiastolic) >= EMERGENCY_THRESHOLDS.dbpCrisis)) {
    alerts.push({ level: 'emergency', icon: '❤️', title: 'Hypertensive Crisis', message: `BP ${bpSystolic}/${bpDiastolic} mmHg. Hypertensive emergency. Immediate intervention required.` });
  }
  return alerts;
}

export function checkComplaintEmergencies(complaint) {
  const alerts = [];
  if (!complaint) return alerts;
  const c = complaint.toLowerCase();
  if (c.includes('chest pain') || c.includes('chest tightness')) {
    alerts.push({ level: 'emergency', icon: '🫀', title: 'Cardiac Warning', message: 'Chest pain — rule out ACS/MI. Check ECG, troponin, and BP in both arms. Consider emergency referral.', action: 'ECG + Troponin STAT' });
  }
  if (c.includes('stroke') || (c.includes('facial') && c.includes('droop')) || c.includes('sudden weakness') || c.includes('sudden numbness')) {
    alerts.push({ level: 'emergency', icon: '🧠', title: 'Possible Stroke', message: 'FAST assessment. If symptoms <4.5h, thrombolysis eligible. Emergency referral immediately.', action: 'Emergency referral NOW' });
  }
  if (c.includes('unconscious') || c.includes('unresponsive') || c.includes('fits') || c.includes('seizure')) {
    alerts.push({ level: 'emergency', icon: '🚨', title: 'Altered Consciousness / Seizure', message: 'Secure airway. Check blood glucose immediately. IV access. Emergency management protocol.', action: 'Airway + IV access' });
  }
  if (c.includes('difficulty breathing') || c.includes('shortness of breath') || c.includes('respiratory distress')) {
    alerts.push({ level: 'emergency', icon: '🫁', title: 'Respiratory Distress', message: 'Oxygen supplementation. Check SpO2 and peak flow. Consider bronchodilators. Refer if severe.', action: 'O2 + check SpO2' });
  }
  if (c.includes('severe bleeding') || c.includes('massive bleed') || c.includes('haematemesis') || c.includes('hematemesis')) {
    alerts.push({ level: 'emergency', icon: '🩸', title: 'Severe Bleeding', message: 'Establish IV access. Cross-match blood. Monitor BP and pulse. Emergency referral.', action: 'IV access + emergency referral' });
  }
  return alerts;
}

export function checkEmergencyFlags({ vitals, chiefComplaint, patient }) {
  const alerts = [];
  if (vitals?.bp) {
    const parts = vitals.bp.split('/');
    if (parts.length === 2) {
      const sys = parseFloat(parts[0]);
      const dia = parseFloat(parts[1]);
      if (sys >= EMERGENCY_THRESHOLDS.sbpCrisis || dia >= EMERGENCY_THRESHOLDS.dbpCrisis) {
        alerts.push({ level: 'emergency', icon: '❤️', title: 'Hypertensive Crisis', message: `BP ${vitals.bp} mmHg — hypertensive emergency. Immediate intervention required.`, action: 'IV antihypertensive STAT' });
      }
    }
  }
  if (vitals?.spo2 && parseFloat(vitals.spo2) < EMERGENCY_THRESHOLDS.spo2Low) {
    alerts.push({ level: 'emergency', icon: '🫁', title: `Critical SpO₂: ${vitals.spo2}%`, message: 'Oxygen saturation critically low. Start oxygen therapy immediately.', action: 'O2 via mask NOW' });
  }
  if (vitals?.temp && parseFloat(vitals.temp) > EMERGENCY_THRESHOLDS.tempFever) {
    alerts.push({ level: 'warning', icon: '🌡️', title: `High Fever: ${vitals.temp}°F`, message: 'Temperature above 103°F. Administer antipyretics and cooling measures.', action: 'Antipyretic + CBC' });
  }
  if (vitals?.pulse) {
    const p = parseFloat(vitals.pulse);
    if (p < 40) alerts.push({ level: 'emergency', icon: '💓', title: `Bradycardia: ${p} bpm`, message: 'Heart rate critically low. Possible heart block or medication toxicity.', action: 'ECG STAT' });
    else if (p > 150) alerts.push({ level: 'emergency', icon: '💓', title: `Tachycardia: ${p} bpm`, message: 'Heart rate critically elevated. Rule out arrhythmia, sepsis, PE.', action: 'ECG + vitals monitor' });
  }
  if (patient?.allergies?.length > 0) {
    alerts.push({ level: 'warning', icon: '⚠️', title: 'Known Drug Allergies', message: `Avoid: ${patient.allergies.join(', ')}. Check all prescriptions carefully.`, action: 'Verify drug safety' });
  }
  const complaintAlerts = checkComplaintEmergencies(chiefComplaint || '');
  alerts.push(...complaintAlerts);
  return alerts;
}

// ─────────────────── NEW: checkVitalsTrend ───────────────────

/**
 * Compare previous and current vitals to detect deteriorating trends
 * @param {object} previousVitals - { bp, pulse, temp, spo2, weight }
 * @param {object} currentVitals  - { bp, pulse, temp, spo2, weight }
 * @returns {string[]} - array of trend alert messages (empty if none)
 */
export function checkVitalsTrend(previousVitals, currentVitals) {
  const alerts = [];
  if (!previousVitals || !currentVitals) return alerts;

  const parseSystolic = (bp) => {
    if (!bp) return null;
    const parts = String(bp).split('/');
    const val = parseFloat(parts[0]);
    return isNaN(val) ? null : val;
  };

  const prevSpo2 = parseFloat(previousVitals.spo2);
  const curSpo2 = parseFloat(currentVitals.spo2);
  if (!isNaN(prevSpo2) && !isNaN(curSpo2) && (prevSpo2 - curSpo2) > 3) {
    alerts.push(`SpO2 declining (${prevSpo2}% → ${curSpo2}%) — reassess respiratory status`);
  }

  const prevPulse = parseFloat(previousVitals.pulse);
  const curPulse = parseFloat(currentVitals.pulse);
  if (!isNaN(prevPulse) && !isNaN(curPulse) && (curPulse - prevPulse) > 20) {
    alerts.push(`Tachycardia worsening (${prevPulse} → ${curPulse} bpm) — investigate cause`);
  }

  const prevTemp = parseFloat(previousVitals.temp);
  const curTemp = parseFloat(currentVitals.temp);
  if (!isNaN(prevTemp) && !isNaN(curTemp) && (curTemp - prevTemp) > 1) {
    alerts.push(`Fever not responding (${prevTemp}°F → ${curTemp}°F) — review treatment`);
  }

  const prevSys = parseSystolic(previousVitals.bp);
  const curSys = parseSystolic(currentVitals.bp);
  if (prevSys !== null && curSys !== null && (prevSys - curSys) > 20) {
    alerts.push(`Blood pressure falling (${previousVitals.bp} → ${currentVitals.bp}) — monitor closely for shock`);
  }

  return alerts;
}
