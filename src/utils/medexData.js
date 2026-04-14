// utils/medexData.js
// Full Medex Bangladesh — 21,714 brands · 1,711 generics
// TWO files served from Firebase Hosting (both gzipped ~478KB + ~427KB):
//   /medex_medicines.json  → brand search index (id, brand, generic, form, strength, mfr, price, pregCat, drugClass)
//   /medex_generics.json   → safety detail (interactions, contraindications, sideEffects, pediatric, pregnancyText)

let _medicines = null;
let _generics = null;
let _medPromise = null;
let _genPromise = null;

// ─── Load medicines (search index) ────────────────────────────
export async function loadMedicines() {
  if (_medicines) return _medicines;
  if (_medPromise) return _medPromise;
  _medPromise = fetch('/medex_medicines.json')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(raw => {
      _medicines = (raw.data || []).map(row => ({
        id:        row[0],
        brand:     row[1],
        generic:   row[2],
        form:      row[3],
        strength:  row[4],
        mfr:       row[5],
        price:     row[6],
        pregCat:   row[7],
        drugClass: row[8],
      }));
      console.log(`Medex loaded: ${_medicines.length} brands`);
      return _medicines;
    })
    .catch(() => { _medicines = FALLBACK_DRUGS; return _medicines; });
  return _medPromise;
}

// ─── Load generics safety data (on demand) ────────────────────
export async function loadGenerics() {
  if (_generics) return _generics;
  if (_genPromise) return _genPromise;
  _genPromise = fetch('/medex_generics.json')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => { _generics = data; return _generics; })
    .catch(() => { _generics = {}; return {}; });
  return _genPromise;
}

// ─── Get safety info for a generic name ───────────────────────
export async function getGenericSafety(genericName) {
  const db = await loadGenerics();
  return db[genericName?.toLowerCase()] || null;
}

// ─── Search drugs (call loadMedicines first) ──────────────────
export function searchDrugsSync(query, db, limit = 25) {
  if (!query || query.length < 2 || !db) return [];
  const q = query.toLowerCase();
  const exact = [], starts = [], contains = [];
  for (const d of db) {
    const b = d.brand?.toLowerCase() || '';
    const g = d.generic?.toLowerCase() || '';
    if (b === q || g === q) { exact.push(d); }
    else if (b.startsWith(q) || g.startsWith(q)) { starts.push(d); }
    else if (b.includes(q) || g.includes(q) || d.mfr?.toLowerCase().includes(q)) { contains.push(d); }
    if (exact.length + starts.length + contains.length >= limit * 2) break;
  }
  return [...exact, ...starts, ...contains].slice(0, limit);
}

// ─── Get all brands for a generic (cost comparison) ───────────
export function findBrandsByGeneric(genericName, db) {
  if (!genericName || !db) return [];
  const g = genericName.toLowerCase();
  return db.filter(d => d.generic?.toLowerCase() === g)
           .sort((a, b) => (a.price || 9999) - (b.price || 9999));
}

// ─── Pregnancy category label ─────────────────────────────────
export function pregCatLabel(cat) {
  const labels = {
    A: { text: 'Category A', color: '#10b981', desc: 'Safe in pregnancy — adequate studies show no risk' },
    B: { text: 'Category B', color: '#3b82f6', desc: 'Probably safe — animal studies OK, limited human data' },
    C: { text: 'Category C', color: '#f59e0b', desc: 'Use with caution — risk cannot be ruled out' },
    D: { text: 'Category D', color: '#ef4444', desc: 'Evidence of risk — use only if benefit outweighs risk' },
    X: { text: 'Category X', color: '#7c3aed', desc: 'CONTRAINDICATED in pregnancy' },
  };
  return labels[cat] || null;
}

// ─── Fallback drugs for offline mode ─────────────────────────
export const FALLBACK_DRUGS = [
  { id:'1',  brand:'Napa',       generic:'Paracetamol',    strength:'500 mg',  form:'Tablet',  mfr:'Beximco Pharma',            price:1.00,  pregCat:'B', drugClass:'Non opioid analgesics' },
  { id:'2',  brand:'Ace',        generic:'Paracetamol',    strength:'500 mg',  form:'Tablet',  mfr:'Square Pharmaceuticals',    price:1.00,  pregCat:'B', drugClass:'Non opioid analgesics' },
  { id:'3',  brand:'Napa Syrup', generic:'Paracetamol',    strength:'120mg/5ml', form:'Syrup', mfr:'Beximco Pharma',            price:20.00, pregCat:'B', drugClass:'Non opioid analgesics' },
  { id:'4',  brand:'Renova',     generic:'Amoxicillin',    strength:'500 mg',  form:'Capsule', mfr:'Renata Limited',            price:8.00,  pregCat:'B', drugClass:'Penicillin antibiotics' },
  { id:'5',  brand:'Moxacil',    generic:'Amoxicillin',    strength:'500 mg',  form:'Capsule', mfr:'Square Pharmaceuticals',    price:7.50,  pregCat:'B', drugClass:'Penicillin antibiotics' },
  { id:'6',  brand:'Fimoxyl',    generic:'Amoxicillin',    strength:'250mg/5ml', form:'Powder for Suspension', mfr:'Incepta',  price:35.00, pregCat:'B', drugClass:'Penicillin antibiotics' },
  { id:'7',  brand:'Azithro',    generic:'Azithromycin',   strength:'500 mg',  form:'Tablet',  mfr:'Square Pharmaceuticals',    price:40.00, pregCat:'B', drugClass:'Macrolide antibiotics' },
  { id:'8',  brand:'Zimax',      generic:'Azithromycin',   strength:'500 mg',  form:'Tablet',  mfr:'Eskayef Bangladesh',        price:38.00, pregCat:'B', drugClass:'Macrolide antibiotics' },
  { id:'9',  brand:'Ciprocin',   generic:'Ciprofloxacin',  strength:'500 mg',  form:'Tablet',  mfr:'Square Pharmaceuticals',    price:12.00, pregCat:'C', drugClass:'Fluoroquinolone antibiotics' },
  { id:'10', brand:'Seclo',      generic:'Omeprazole',     strength:'20 mg',   form:'Capsule', mfr:'Square Pharmaceuticals',    price:4.00,  pregCat:'C', drugClass:'Proton pump inhibitors' },
  { id:'11', brand:'Pantonix',   generic:'Pantoprazole',   strength:'40 mg',   form:'Tablet',  mfr:'Incepta Pharmaceuticals',   price:6.00,  pregCat:'B', drugClass:'Proton pump inhibitors' },
  { id:'12', brand:'Losartas',   generic:'Losartan',       strength:'50 mg',   form:'Tablet',  mfr:'Square Pharmaceuticals',    price:6.00,  pregCat:'D', drugClass:'Antihypertensives' },
  { id:'13', brand:'Amlovas',    generic:'Amlodipine',     strength:'5 mg',    form:'Tablet',  mfr:'Square Pharmaceuticals',    price:4.00,  pregCat:'C', drugClass:'Antihypertensives' },
  { id:'14', brand:'Atenol',     generic:'Atenolol',       strength:'50 mg',   form:'Tablet',  mfr:'Square Pharmaceuticals',    price:2.00,  pregCat:'D', drugClass:'Antihypertensives' },
  { id:'15', brand:'Gluco',      generic:'Metformin',      strength:'500 mg',  form:'Tablet',  mfr:'Square Pharmaceuticals',    price:2.00,  pregCat:'B', drugClass:'Antidiabetic drugs' },
  { id:'16', brand:'Cetrizin',   generic:'Cetirizine',     strength:'10 mg',   form:'Tablet',  mfr:'Square Pharmaceuticals',    price:3.00,  pregCat:'B', drugClass:'Antihistamines' },
  { id:'17', brand:'Diclofen',   generic:'Diclofenac',     strength:'50 mg',   form:'Tablet',  mfr:'Square Pharmaceuticals',    price:3.50,  pregCat:'C', drugClass:'NSAIDs' },
  { id:'18', brand:'Domper',     generic:'Domperidone',    strength:'10 mg',   form:'Tablet',  mfr:'Square Pharmaceuticals',    price:3.00,  pregCat:'C', drugClass:'Antiemetics' },
  { id:'19', brand:'Metrogyl',   generic:'Metronidazole',  strength:'400 mg',  form:'Tablet',  mfr:'J.B. Chemicals',           price:3.00,  pregCat:'B', drugClass:'Antiprotozoals' },
  { id:'20', brand:'Ambrox',     generic:'Ambroxol',       strength:'30 mg',   form:'Tablet',  mfr:'Square Pharmaceuticals',    price:4.00,  pregCat:'B', drugClass:'Mucolytics' },
  { id:'21', brand:'Salbutol',   generic:'Salbutamol',     strength:'2 mg',    form:'Tablet',  mfr:'Square Pharmaceuticals',    price:1.00,  pregCat:'C', drugClass:'Bronchodilators' },
  { id:'22', brand:'Montelair',  generic:'Montelukast',    strength:'10 mg',   form:'Tablet',  mfr:'Incepta Pharmaceuticals',   price:12.00, pregCat:'B', drugClass:'Anti-asthmatic drugs' },
  { id:'23', brand:'Prednisolon',generic:'Prednisolone',   strength:'5 mg',    form:'Tablet',  mfr:'Square Pharmaceuticals',    price:2.00,  pregCat:'C', drugClass:'Corticosteroids' },
  { id:'24', brand:'Orsaline N', generic:'ORS',            strength:'',        form:'Powder',  mfr:'Square Pharmaceuticals',    price:5.00,  pregCat:'A', drugClass:'Electrolytes' },
  { id:'25', brand:'Calcimate',  generic:'Calcium Carbonate', strength:'500 mg', form:'Tablet', mfr:'Square Pharmaceuticals',  price:3.00,  pregCat:'A', drugClass:'Minerals & Vitamins' },
];
