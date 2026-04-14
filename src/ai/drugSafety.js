// ai/drugSafety.js
// Hardcoded drug safety system — NEVER calls AI
// All functions are synchronous and deterministic
// Phase 5 — Pran Sanjeevani

// ─────────────────── Cross-reactivity map ────────────────────

const CROSS_REACTIVITY = {
  'penicillin': ['amoxicillin', 'ampicillin', 'cloxacillin', 'flucloxacillin'],
  'amoxicillin': ['penicillin', 'ampicillin', 'cloxacillin', 'flucloxacillin'],
  'ampicillin': ['penicillin', 'amoxicillin', 'cloxacillin', 'flucloxacillin'],
  'cloxacillin': ['penicillin', 'amoxicillin', 'ampicillin', 'flucloxacillin'],
  'flucloxacillin': ['penicillin', 'amoxicillin', 'ampicillin', 'cloxacillin'],
  'sulfa': ['cotrimoxazole', 'sulfamethoxazole', 'trimethoprim+sulfamethoxazole'],
  'sulfonamide': ['cotrimoxazole', 'sulfamethoxazole', 'trimethoprim+sulfamethoxazole'],
  'cotrimoxazole': ['sulfa', 'sulfonamide', 'sulfamethoxazole'],
  'sulfamethoxazole': ['sulfa', 'sulfonamide', 'cotrimoxazole'],
  'aspirin': ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac'],
  'nsaid': ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'aspirin'],
  'ibuprofen': ['aspirin', 'naproxen', 'diclofenac', 'ketorolac'],
  'naproxen': ['aspirin', 'ibuprofen', 'diclofenac', 'ketorolac'],
  'diclofenac': ['aspirin', 'ibuprofen', 'naproxen', 'ketorolac'],
  'ketorolac': ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
  'cephalosporin': ['cefalexin', 'cefuroxime', 'ceftriaxone', 'cefixime'],
  'cefalexin': ['cephalosporin', 'cefuroxime', 'ceftriaxone', 'cefixime'],
  'cefuroxime': ['cephalosporin', 'cefalexin', 'ceftriaxone', 'cefixime'],
  'ceftriaxone': ['cephalosporin', 'cefalexin', 'cefuroxime', 'cefixime'],
  'cefixime': ['cephalosporin', 'cefalexin', 'cefuroxime', 'ceftriaxone'],
};

// ─────────────────── Drug class maps ─────────────────────────

const DRUG_CLASSES = {
  ACE_INHIBITORS: ['enalapril', 'lisinopril', 'ramipril', 'perindopril', 'captopril'],
  STATINS: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'lovastatin', 'pravastatin'],
  FLUOROQUINOLONES: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'ofloxacin'],
  SSRIS: ['fluoxetine', 'sertraline', 'escitalopram', 'paroxetine', 'citalopram', 'fluvoxamine'],
  MAOIS: ['phenelzine', 'tranylcypromine', 'moclobemide', 'selegiline'],
  ANTIDEPRESSANTS: [
    'amitriptyline', 'nortriptyline', 'imipramine', 'clomipramine',
    'venlafaxine', 'duloxetine', 'mirtazapine',
    'fluoxetine', 'sertraline', 'escitalopram', 'paroxetine', 'citalopram',
  ],
  ANTIBIOTICS: [
    'amoxicillin', 'ciprofloxacin', 'azithromycin', 'metronidazole', 'cotrimoxazole',
    'cefalexin', 'ceftriaxone', 'doxycycline', 'levofloxacin', 'clarithromycin',
    'erythromycin', 'ampicillin', 'cloxacillin', 'meropenem', 'piperacillin',
    'tetracycline', 'gentamicin', 'amikacin', 'vancomycin',
  ],
  STEROIDS: [
    'prednisolone', 'dexamethasone', 'methylprednisolone', 'hydrocortisone',
    'betamethasone', 'budesonide', 'fludrocortisone',
  ],
  BROAD_SPECTRUM: ['ciprofloxacin', 'levofloxacin', 'meropenem', 'piperacillin', 'amoxicillin-clavulanate'],
  ANTACIDS: ['aluminium hydroxide', 'magnesium hydroxide', 'calcium carbonate', 'omeprazole', 'pantoprazole'],
};

// ─────────────────── Interaction database ────────────────────

const MAJOR_INTERACTIONS = [
  { drug1: 'warfarin', drug2: 'aspirin', description: 'Major bleeding risk — avoid combination' },
  { drug1: 'warfarin', drug2: 'ciprofloxacin', description: 'Warfarin effect greatly increased — monitor INR closely' },
  { drug1: 'warfarin', drug2: 'metronidazole', description: 'Major bleeding risk — warfarin levels doubled' },
  { drug1: 'metformin', drug2: 'contrast dye', description: 'Risk of lactic acidosis — hold metformin before contrast' },
  { drug1: 'SSRI', drug2: 'tramadol', description: 'Serotonin syndrome risk — avoid combination' },
  { drug1: 'MAOI', drug2: 'antidepressant', description: 'Hypertensive crisis risk — never combine' },
  { drug1: 'digoxin', drug2: 'amiodarone', description: 'Digoxin toxicity risk — reduce digoxin dose by 50%' },
];

const MODERATE_INTERACTIONS = [
  { drug1: 'metformin', drug2: 'alcohol', description: 'Lactic acidosis risk — advise no alcohol' },
  { drug1: 'ACE_INHIBITOR', drug2: 'potassium', description: 'Hyperkalemia risk — monitor potassium levels' },
  { drug1: 'statin', drug2: 'erythromycin', description: 'Myopathy risk — consider dose reduction' },
  { drug1: 'statin', drug2: 'clarithromycin', description: 'Myopathy risk — consider alternative antibiotic' },
  { drug1: 'fluoroquinolone', drug2: 'antacid', description: 'Reduced antibiotic absorption — give 2hr apart' },
  { drug1: 'metformin', drug2: 'iodinated contrast', description: 'Hold metformin 48hr before contrast — risk of lactic acidosis' },
  { drug1: 'amlodipine', drug2: 'simvastatin', description: 'Myopathy risk — maximum Simvastatin 20mg with Amlodipine' },
  { drug1: 'warfarin', drug2: 'ibuprofen', description: 'Increased bleeding risk — use Paracetamol instead' },
  { drug1: 'warfarin', drug2: 'naproxen', description: 'Increased bleeding risk — use Paracetamol instead' },
  { drug1: 'methotrexate', drug2: 'cotrimoxazole', description: 'Risk of methotrexate toxicity — avoid combination' },
  { drug1: 'lithium', drug2: 'ibuprofen', description: 'Lithium toxicity risk — monitor levels' },
  { drug1: 'lithium', drug2: 'diclofenac', description: 'Lithium toxicity risk — monitor levels' },
];

// ─────────────────── Pregnancy categories ────────────────────

const PREGNANCY_CATEGORIES = {
  // Category A — Confirmed safe
  'folic acid': { category: 'A', label: 'Safe in pregnancy', color: '#059669' },
  'ferrous sulfate': { category: 'A', label: 'Safe in pregnancy', color: '#059669' },
  'ferrous sulphate': { category: 'A', label: 'Safe in pregnancy', color: '#059669' },
  'levothyroxine': { category: 'A', label: 'Safe in pregnancy', color: '#059669' },
  'iron': { category: 'A', label: 'Safe in pregnancy', color: '#059669' },

  // Category B — Probably safe
  'paracetamol': { category: 'B', label: 'Probably safe', color: '#10b981' },
  'acetaminophen': { category: 'B', label: 'Probably safe', color: '#10b981' },
  'metformin': { category: 'B', label: 'Probably safe (monitor)', color: '#10b981' },
  'insulin': { category: 'B', label: 'Safe — preferred in pregnancy', color: '#10b981' },
  'amoxicillin': { category: 'B', label: 'Probably safe', color: '#10b981' },
  'cefalexin': { category: 'B', label: 'Probably safe', color: '#10b981' },
  'cephalexin': { category: 'B', label: 'Probably safe', color: '#10b981' },
  'azithromycin': { category: 'B', label: 'Probably safe', color: '#10b981' },
  'clotrimazole': { category: 'B', label: 'Probably safe (topical)', color: '#10b981' },

  // Category C — Weigh risk/benefit
  'omeprazole': { category: 'C', label: 'Weigh risk/benefit', color: '#f59e0b' },
  'pantoprazole': { category: 'C', label: 'Weigh risk/benefit', color: '#f59e0b' },
  'atenolol': { category: 'C', label: 'Weigh risk/benefit — may cause fetal bradycardia', color: '#f59e0b' },
  'amlodipine': { category: 'C', label: 'Weigh risk/benefit', color: '#f59e0b' },
  'metoprolol': { category: 'C', label: 'Weigh risk/benefit', color: '#f59e0b' },
  'ciprofloxacin': { category: 'C', label: 'Avoid — use safer alternative', color: '#f59e0b' },
  'metronidazole': { category: 'C', label: 'Avoid in 1st trimester', color: '#f59e0b' },
  'prednisolone': { category: 'C', label: 'Use only if clearly needed', color: '#f59e0b' },
  'dexamethasone': { category: 'C', label: 'Use only if clearly needed', color: '#f59e0b' },
  'cetirizine': { category: 'C', label: 'Weigh risk/benefit', color: '#f59e0b' },
  'levocetirizine': { category: 'C', label: 'Weigh risk/benefit', color: '#f59e0b' },
  'fluconazole': { category: 'C', label: 'Avoid high-dose/long-term', color: '#f59e0b' },
  'tramadol': { category: 'C', label: 'Avoid near term — neonatal withdrawal', color: '#f59e0b' },
  'methyldopa': { category: 'B', label: 'Preferred antihypertensive in pregnancy', color: '#10b981' },

  // Category D — Avoid if possible
  'enalapril': { category: 'D', label: 'Avoid — use methyldopa for HTN in pregnancy', color: '#ea580c' },
  'lisinopril': { category: 'D', label: 'Avoid — fetal renal toxicity', color: '#ea580c' },
  'ramipril': { category: 'D', label: 'Avoid — fetal harm', color: '#ea580c' },
  'perindopril': { category: 'D', label: 'Avoid — fetal harm', color: '#ea580c' },
  'captopril': { category: 'D', label: 'Avoid — fetal harm', color: '#ea580c' },
  'losartan': { category: 'D', label: 'Avoid — fetal renal toxicity', color: '#ea580c' },
  'valsartan': { category: 'D', label: 'Avoid — fetal renal toxicity', color: '#ea580c' },
  'irbesartan': { category: 'D', label: 'Avoid — fetal harm', color: '#ea580c' },
  'tetracycline': { category: 'D', label: 'Avoid — bone/teeth damage', color: '#ea580c' },
  'doxycycline': { category: 'D', label: 'Avoid — bone/teeth damage', color: '#ea580c' },
  'phenytoin': { category: 'D', label: 'Avoid — fetal hydantoin syndrome', color: '#ea580c' },
  'carbamazepine': { category: 'D', label: 'Avoid — neural tube defects', color: '#ea580c' },
  'valproic acid': { category: 'D', label: 'Avoid — major teratogen', color: '#ea580c' },
  'sodium valproate': { category: 'D', label: 'Avoid — major teratogen', color: '#ea580c' },
  'lithium': { category: 'D', label: 'Avoid — cardiac malformations (Ebstein)', color: '#ea580c' },

  // Category X — Absolute contraindication
  'atorvastatin': { category: 'X', label: 'CONTRAINDICATED — stop before pregnancy', color: '#dc2626' },
  'rosuvastatin': { category: 'X', label: 'CONTRAINDICATED — stop before pregnancy', color: '#dc2626' },
  'simvastatin': { category: 'X', label: 'CONTRAINDICATED — stop before pregnancy', color: '#dc2626' },
  'lovastatin': { category: 'X', label: 'CONTRAINDICATED — stop before pregnancy', color: '#dc2626' },
  'pravastatin': { category: 'X', label: 'CONTRAINDICATED — stop before pregnancy', color: '#dc2626' },
  'warfarin': { category: 'X', label: 'CONTRAINDICATED — use LMWH in pregnancy', color: '#dc2626' },
  'isotretinoin': { category: 'X', label: 'CONTRAINDICATED — severe teratogen', color: '#dc2626' },
  'methotrexate': { category: 'X', label: 'CONTRAINDICATED — abortifacient & teratogen', color: '#dc2626' },
  'misoprostol': { category: 'X', label: 'CONTRAINDICATED — causes abortion/uterine rupture', color: '#dc2626' },
  'finasteride': { category: 'X', label: 'CONTRAINDICATED', color: '#dc2626' },
  'thalidomide': { category: 'X', label: 'CONTRAINDICATED — severe teratogen', color: '#dc2626' },
};

// ─────────────────── Helper: normalize drug name ──────────────

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().trim();
}

function matchesClass(genericName, classArray) {
  const n = normalizeName(genericName);
  return classArray.some(d => n.includes(normalizeName(d)) || normalizeName(d).includes(n));
}

// ─────────────────── A) checkAllergies ───────────────────────

/**
 * Check if a medicine conflicts with patient allergies
 * @param {object} medicine - { genericName, brandName }
 * @param {string[]} patientAllergies - list of known allergens
 * @returns {{ hit: boolean, allergen: string|null, severity: 'hard-stop'|'warning' }}
 */
export function checkAllergies(medicine, patientAllergies = []) {
  if (!medicine || !patientAllergies.length) {
    return { hit: false, allergen: null, severity: null };
  }

  const generic = normalizeName(medicine.genericName || '');
  const brand = normalizeName(medicine.brandName || '');

  for (const allergy of patientAllergies) {
    if (!allergy) continue;
    const a = normalizeName(allergy);

    // Direct match — hard stop
    if (generic.includes(a) || a.includes(generic) || brand.includes(a)) {
      return { hit: true, allergen: allergy, severity: 'hard-stop' };
    }

    // Cross-reactivity check
    const crossReactants = CROSS_REACTIVITY[a] || [];
    for (const cr of crossReactants) {
      if (generic.includes(normalizeName(cr)) || normalizeName(cr).includes(generic)) {
        return { hit: true, allergen: allergy, severity: 'warning' };
      }
    }

    // Reverse cross-reactivity: check if allergy is in the cross-reactants of the drug
    const drugCrossReactants = CROSS_REACTIVITY[generic] || [];
    for (const cr of drugCrossReactants) {
      if (a.includes(normalizeName(cr)) || normalizeName(cr).includes(a)) {
        return { hit: true, allergen: allergy, severity: 'warning' };
      }
    }
  }

  return { hit: false, allergen: null, severity: null };
}

// ─────────────────── B) checkDuplicateGeneric ────────────────

/**
 * Check if same generic is already prescribed
 * @param {object} medicine - { genericName }
 * @param {object[]} existingMedicines - already added medicines
 * @returns {{ duplicate: boolean, existingBrand: string|null }}
 */
export function checkDuplicateGeneric(medicine, existingMedicines = []) {
  if (!medicine.genericName) return { duplicate: false, existingBrand: null };
  const newGeneric = normalizeName(medicine.genericName);

  for (const existing of existingMedicines) {
    if (!existing.genericName) continue;
    const exGeneric = normalizeName(existing.genericName);

    if (
      newGeneric === exGeneric ||
      newGeneric.includes(exGeneric) ||
      exGeneric.includes(newGeneric)
    ) {
      return { duplicate: true, existingBrand: existing.brandName || existing.genericName };
    }
  }
  return { duplicate: false, existingBrand: null };
}

// ─────────────────── C) checkDrugInteractions ────────────────

/**
 * Check for drug interactions with existing medicines
 * @param {object} medicine - new medicine being added
 * @param {object[]} existingMedicines - already added medicines
 * @returns {Array<{ drug1, drug2, severity: 'major'|'moderate', description }>}
 */
export function checkDrugInteractions(medicine, existingMedicines = []) {
  if (!existingMedicines.length) return [];

  const interactions = [];
  const newGeneric = normalizeName(medicine.genericName || '');
  const newBrand = normalizeName(medicine.brandName || '');

  const isSSRI = matchesClass(newGeneric, DRUG_CLASSES.SSRIS);
  const isMAOI = matchesClass(newGeneric, DRUG_CLASSES.MAOIS);
  const isAntidepressant = matchesClass(newGeneric, DRUG_CLASSES.ANTIDEPRESSANTS);
  const isStatin = matchesClass(newGeneric, DRUG_CLASSES.STATINS);
  const isFluoroquinolone = matchesClass(newGeneric, DRUG_CLASSES.FLUOROQUINOLONES);
  const isACEInhibitor = matchesClass(newGeneric, DRUG_CLASSES.ACE_INHIBITORS);
  const isAntacid = medicine.dosageForm && normalizeName(medicine.dosageForm).includes('antacid')
    || matchesClass(newGeneric, DRUG_CLASSES.ANTACIDS);

  for (const existing of existingMedicines) {
    const exGeneric = normalizeName(existing.genericName || '');
    const exBrand = normalizeName(existing.brandName || '');

    const exIsSSRI = matchesClass(exGeneric, DRUG_CLASSES.SSRIS);
    const exIsMAOI = matchesClass(exGeneric, DRUG_CLASSES.MAOIS);
    const exIsAntidepressant = matchesClass(exGeneric, DRUG_CLASSES.ANTIDEPRESSANTS);
    const exIsStatin = matchesClass(exGeneric, DRUG_CLASSES.STATINS);
    const exIsFluoroquinolone = matchesClass(exGeneric, DRUG_CLASSES.FLUOROQUINOLONES);
    const exIsACEInhibitor = matchesClass(exGeneric, DRUG_CLASSES.ACE_INHIBITORS);
    const exIsAntacid = matchesClass(exGeneric, DRUG_CLASSES.ANTACIDS);

    // Check MAJOR interactions
    for (const interaction of MAJOR_INTERACTIONS) {
      const { drug1, drug2, description } = interaction;

      const newMatchesDrug1 = newGeneric.includes(drug1) || (drug1 === 'SSRI' && isSSRI) || (drug1 === 'MAOI' && isMAOI);
      const newMatchesDrug2 = newGeneric.includes(drug2) || (drug2 === 'SSRI' && isSSRI) || (drug2 === 'antidepressant' && isAntidepressant) || (drug2 === 'MAOI' && isMAOI);
      const exMatchesDrug1 = exGeneric.includes(drug1) || (drug1 === 'SSRI' && exIsSSRI) || (drug1 === 'MAOI' && exIsMAOI);
      const exMatchesDrug2 = exGeneric.includes(drug2) || (drug2 === 'SSRI' && exIsSSRI) || (drug2 === 'antidepressant' && exIsAntidepressant) || (drug2 === 'MAOI' && exIsMAOI);

      if ((newMatchesDrug1 && exMatchesDrug2) || (newMatchesDrug2 && exMatchesDrug1)) {
        interactions.push({
          drug1: medicine.brandName || medicine.genericName,
          drug2: existing.brandName || existing.genericName,
          severity: 'major',
          description,
        });
      }
    }

    // Check MODERATE interactions
    for (const interaction of MODERATE_INTERACTIONS) {
      const { drug1, drug2, description } = interaction;

      const newMatchesDrug1 = newGeneric.includes(drug1)
        || (drug1 === 'statin' && isStatin)
        || (drug1 === 'fluoroquinolone' && isFluoroquinolone)
        || (drug1 === 'ACE_INHIBITOR' && isACEInhibitor)
        || (drug1 === 'antacid' && isAntacid);
      const newMatchesDrug2 = newGeneric.includes(drug2)
        || (drug2 === 'statin' && isStatin)
        || (drug2 === 'fluoroquinolone' && isFluoroquinolone)
        || (drug2 === 'ACE_INHIBITOR' && isACEInhibitor)
        || (drug2 === 'antacid' && isAntacid);
      const exMatchesDrug1 = exGeneric.includes(drug1)
        || (drug1 === 'statin' && exIsStatin)
        || (drug1 === 'fluoroquinolone' && exIsFluoroquinolone)
        || (drug1 === 'ACE_INHIBITOR' && exIsACEInhibitor)
        || (drug1 === 'antacid' && exIsAntacid);
      const exMatchesDrug2 = exGeneric.includes(drug2)
        || (drug2 === 'statin' && exIsStatin)
        || (drug2 === 'fluoroquinolone' && exIsFluoroquinolone)
        || (drug2 === 'ACE_INHIBITOR' && exIsACEInhibitor)
        || (drug2 === 'antacid' && exIsAntacid);

      if ((newMatchesDrug1 && exMatchesDrug2) || (newMatchesDrug2 && exMatchesDrug1)) {
        interactions.push({
          drug1: medicine.brandName || medicine.genericName,
          drug2: existing.brandName || existing.genericName,
          severity: 'moderate',
          description,
        });
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  return interactions.filter(i => {
    const key = `${i.drug1}|${i.drug2}|${i.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────── D) getPregnancyCategory ─────────────────

/**
 * Get pregnancy category for a drug
 * @param {string} genericName
 * @returns {{ category: 'A'|'B'|'C'|'D'|'X'|'N', label: string, color: string }}
 */
export function getPregnancyCategory(genericName) {
  if (!genericName) return { category: 'N', label: 'Not classified', color: '#9ca3af' };

  const n = normalizeName(genericName);

  // Direct lookup
  if (PREGNANCY_CATEGORIES[n]) return PREGNANCY_CATEGORIES[n];

  // Partial match
  for (const [key, value] of Object.entries(PREGNANCY_CATEGORIES)) {
    if (n.includes(key) || key.includes(n)) {
      return value;
    }
  }

  return { category: 'N', label: 'Not classified — verify before prescribing', color: '#9ca3af' };
}

// ─────────────────── E) getPediatricDoseNote ─────────────────

/**
 * Get pediatric dosing note for a medicine
 * @param {object} medicine - { genericName, dosageForm }
 * @param {number} patientAge - in years
 * @param {number|null} patientWeight - in kg
 * @returns {string|null}
 */
export function getPediatricDoseNote(medicine, patientAge, patientWeight) {
  if (!medicine || patientAge === undefined || patientAge === null || patientAge >= 18) return null;

  const generic = normalizeName(medicine.genericName || '');
  const form = normalizeName(medicine.dosageForm || '');
  const notes = [];

  // Absolute contraindications
  if (generic.includes('aspirin')) {
    notes.push('⛔ AVOID in children <12 — Reye\'s syndrome risk');
    return notes.join(' | ');
  }
  if (generic.includes('tetracycline') || generic.includes('doxycycline')) {
    if (patientAge < 8) {
      notes.push('⛔ AVOID in children <8 — permanent tooth discoloration and bone growth inhibition');
      return notes.join(' | ');
    }
  }

  // Caution drugs
  if (generic.includes('ciprofloxacin') || generic.includes('levofloxacin') || generic.includes('ofloxacin')) {
    notes.push('⚠️ Use with caution in children — fluoroquinolones may affect cartilage development');
  }

  // Tablet in young child
  if (patientAge < 12 && (form.includes('tablet') || form.includes('capsule'))) {
    notes.push('Consider syrup/liquid formulation for better adherence in young children');
  }

  // Weight-based doses
  if (patientWeight) {
    const w = parseFloat(patientWeight);
    if (!isNaN(w)) {
      if (generic.includes('paracetamol') || generic.includes('acetaminophen')) {
        const minDose = Math.round(10 * w);
        const maxDose = Math.round(15 * w);
        notes.push(`Paracetamol dose: ${minDose}–${maxDose} mg per dose (10–15 mg/kg), max 4 doses/day`);
      }
      if (generic.includes('amoxicillin')) {
        const minDose = Math.round(25 * w);
        const maxDose = Math.round(50 * w);
        notes.push(`Amoxicillin dose: ${minDose}–${maxDose} mg/day divided in 3 doses (25–50 mg/kg/day)`);
      }
      if (generic.includes('ibuprofen')) {
        if (patientAge < 0.5) {
          notes.push('⛔ AVOID Ibuprofen under 6 months of age');
        } else {
          const minDose = Math.round(5 * w);
          const maxDose = Math.round(10 * w);
          notes.push(`Ibuprofen dose: ${minDose}–${maxDose} mg per dose (5–10 mg/kg), every 6–8 hours`);
        }
      }
    }
  }

  // Cetirizine age-based
  if (generic.includes('cetirizine') || generic.includes('levocetirizine')) {
    if (patientAge < 6) notes.push('Dose: 2.5 mg once daily (age <6y)');
    else if (patientAge < 12) notes.push('Dose: 5 mg once daily (age 6–12y)');
    else notes.push('Dose: 10 mg once daily (age >12y)');
  }

  return notes.length > 0 ? notes.join(' | ') : null;
}

// ─────────────────── F) checkAntibioticStewardship ───────────

/**
 * Check antibiotic stewardship concerns
 * @param {object} medicine - { genericName }
 * @param {string} duration - e.g. "5 days" or "7 days"
 * @returns {{ warn: boolean, message: string }|null}
 */
export function checkAntibioticStewardship(medicine, duration) {
  const generic = normalizeName(medicine.genericName || '');
  const isAntibiotic = DRUG_CLASSES.ANTIBIOTICS.some(ab => generic.includes(normalizeName(ab)));
  if (!isAntibiotic) return null;

  const messages = [];

  // Broad-spectrum warning
  const isBroadSpectrum = DRUG_CLASSES.BROAD_SPECTRUM.some(ab => generic.includes(normalizeName(ab)));
  if (isBroadSpectrum) {
    messages.push('Consider sending culture/sensitivity before starting broad-spectrum antibiotic');
  }

  // Duration checks
  if (duration) {
    const daysMatch = duration.match(/(\d+)\s*(day|days)/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      if (days < 3) {
        messages.push('⚠️ Short course: most infections need minimum 5 days of antibiotics');
      } else if (days > 14) {
        messages.push('⚠️ Long antibiotic course (>14 days) — confirm indication and consider review');
      }
    }
  }

  if (messages.length === 0) return null;
  return { warn: true, message: messages.join(' · ') };
}

// ─────────────────── G) checkSteroidGuard ────────────────────

/**
 * Check steroid safety concerns
 * @param {object} medicine - { genericName }
 * @param {string} duration - e.g. "7 days"
 * @param {object} patient - { chronicConditions }
 * @returns {{ warn: boolean, messages: string[] }|null}
 */
export function checkSteroidGuard(medicine, duration, patient = {}) {
  const generic = normalizeName(medicine.genericName || '');
  const isSteroid = DRUG_CLASSES.STEROIDS.some(s => generic.includes(normalizeName(s)));
  if (!isSteroid) return null;

  const messages = [];

  // Always warn on systemic steroids (not inhaled budesonide)
  const isInhaled = normalizeName(medicine.dosageForm || '').includes('inhaler')
    || normalizeName(medicine.dosageForm || '').includes('nebuliser');

  if (!isInhaled) {
    messages.push('Monitor blood glucose — steroids can significantly raise blood sugar');
  }

  if (duration) {
    const daysMatch = duration.match(/(\d+)\s*(day|days)/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      if (days > 7) {
        messages.push('Duration >7 days: consider Calcium + Vitamin D for bone protection');
      }
      if (days > 14) {
        messages.push('⚠️ Duration >14 days: do NOT stop abruptly — taper dose gradually');
      }
    }
  }

  // DM comorbidity
  const hasDM = (patient.chronicConditions || []).some(c =>
    normalizeName(c).includes('dm') || normalizeName(c).includes('diabet')
  );
  if (hasDM) {
    messages.push('⚠️ Patient has DM: steroids significantly worsen glycemic control — monitor closely and adjust antidiabetics');
  }

  if (messages.length === 0) return null;
  return { warn: true, messages };
}

// ─────────────────── Composite safety check ──────────────────

/**
 * Run all safety checks for a single medicine
 * @param {object} medicine - medicine object
 * @param {object[]} existingMedicines - already in list (excluding this one)
 * @param {object} patient - { allergies, chronicConditions, age, sex, weight }
 * @returns {object} - all warnings combined
 */
export function runAllSafetyChecks(medicine, existingMedicines, patient = {}) {
  const allergy = checkAllergies(medicine, patient.allergies || []);
  const duplicate = checkDuplicateGeneric(medicine, existingMedicines);
  const interactions = checkDrugInteractions(medicine, existingMedicines);
  const pregnancyCategory = getPregnancyCategory(medicine.genericName);
  const showPregnancy = patient.sex === 'Female' && patient.age >= 12 && patient.age <= 50;
  const pediatric = getPediatricDoseNote(medicine, patient.age, patient.weight);
  const antibiotic = checkAntibioticStewardship(medicine, medicine.duration);
  const steroid = checkSteroidGuard(medicine, medicine.duration, patient);

  return {
    allergy,
    duplicate,
    interactions,
    pregnancyCategory: showPregnancy ? pregnancyCategory : null,
    pediatric,
    antibiotic,
    steroid,
  };
}
