import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Plus, Pill, ChevronRight, AlertTriangle } from 'lucide-react';
import { loadMedicines, searchDrugsSync, findBrandsByGeneric, pregCatLabel } from '../utils/medexData';
import { checkAllergies } from '../ai/drugSafety';

const S = {
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'flex-end', animation:'fadeIn 0.2s ease' },
  sheet:     { width:'100%', maxWidth:480, margin:'0 auto', background:'#fff', borderRadius:'24px 24px 0 0', boxShadow:'0 -20px 60px rgba(0,0,0,0.2)', animation:'slideUp 0.3s ease', display:'flex', flexDirection:'column', maxHeight:'92vh' },
  handle:    { width:40, height:4, background:'#e5e7eb', borderRadius:4, margin:'12px auto 0', flexShrink:0 },
  header:    { padding:'12px 20px 0', flexShrink:0 },
  title:     { fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--navy)' },
  closeBtn:  { width:32, height:32, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280' },
  searchBox: { display:'flex', alignItems:'center', gap:10, background:'#f8f9fc', border:'1.5px solid #e5e7eb', borderRadius:12, padding:'0 14px', marginBottom:4 },
  searchInput:{ flex:1, border:'none', background:'transparent', padding:'13px 0', fontSize:15, fontFamily:'var(--font-body)', color:'#1f2937', outline:'none' },
  resultCount:{ fontSize:12, color:'#9ca3af', padding:'4px 0 8px', fontFamily:'var(--font-body)' },
  list:      { flex:1, overflowY:'auto', padding:'0 0 24px' },
  drugItem:  { display:'flex', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid #f3f4f6', cursor:'pointer', gap:12, width:'100%', background:'transparent', border:'none', textAlign:'left' },
  drugIcon:  { width:40, height:40, borderRadius:10, background:'rgba(15,76,129,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  drugInfo:  { flex:1, minWidth:0 },
  brandName: { fontSize:15, fontWeight:700, color:'#1f2937', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  genericRow:{ display:'flex', alignItems:'center', gap:5, marginTop:2, flexWrap:'wrap' },
  genericName:{ fontSize:12, color:'#6b7280', flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  badge:     { fontSize:10, borderRadius:5, padding:'1px 6px', fontFamily:'var(--font-body)', whiteSpace:'nowrap', fontWeight:600 },
  price:     { fontSize:13, color:'#10b981', fontWeight:700, flexShrink:0 },
  spinner:   { display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', gap:12, color:'#6b7280', fontFamily:'var(--font-body)', fontSize:14 },
  spinIcon:  { width:20, height:20, border:'2px solid #e5e7eb', borderTopColor:'var(--navy)', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  emptyState:{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 20px', gap:12, fontFamily:'var(--font-body)' },
  addBtn:    { display:'flex', alignItems:'center', gap:8, margin:'8px 20px', padding:'13px 16px', background:'linear-gradient(135deg,#0f4c81,#1a6bb5)', borderRadius:12, border:'none', cursor:'pointer', color:'white', fontFamily:'var(--font-body)', fontSize:14, fontWeight:600, justifyContent:'center' },
};

const PREG_COLORS = { A:'#10b981', B:'#3b82f6', C:'#f59e0b', D:'#ef4444', X:'#7c3aed' };

export default function DrugSearchModal({ isOpen, onClose, onSelect, patientAllergies = [], patientSex, patientAge }) {
  const [db, setDb] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allergyAlert, setAllergyAlert] = useState(null);
  const [pendingDrug, setPendingDrug] = useState(null);
  const [altView, setAltView] = useState(null); // brand alternatives for a generic
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const showPreg = patientSex === 'Female' && patientAge >= 12 && patientAge <= 55;

  // Load Medex DB on first open
  useEffect(() => {
    if (isOpen && !db && !dbLoading) {
      setDbLoading(true);
      loadMedicines().then(d => { setDb(d); setDbLoading(false); });
    }
    if (isOpen) {
      setQuery(''); setResults([]); setHasSearched(false);
      setPendingDrug(null); setAllergyAlert(null); setAltView(null);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback((q) => {
    if (!db) return;
    const t = q.trim();
    if (!t) { setResults([]); setHasSearched(false); setSearching(false); return; }
    setSearching(true);
    const found = searchDrugsSync(t, db, 50);
    setResults(found);
    setHasSearched(true);
    setSearching(false);
  }, [db]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(timerRef.current);
  }, [query, doSearch]);

  const handleSelect = (drug) => {
    if (patientAllergies.length > 0) {
      const check = checkAllergies({ genericName: drug.generic, brandName: drug.brand }, patientAllergies);
      if (check.hit) { setPendingDrug(drug); setAllergyAlert(check); return; }
    }
    onSelect(normalizeDrug(drug));
    onClose();
  };

  const handleOverride = () => {
    if (pendingDrug) { onSelect({ ...normalizeDrug(pendingDrug), allergyOverride: true }); onClose(); }
  };

  const handleAddCustom = () => {
    onSelect({ brandName: query.trim() || 'Custom Drug', genericName: '', strength: '', dosageForm: 'Tablet', manufacturer: '', price: null, isCustom: true });
    onClose();
  };

  const handleShowAlts = (e, drug) => {
    e.stopPropagation();
    if (!db) return;
    const alts = findBrandsByGeneric(drug.generic, db);
    setAltView({ generic: drug.generic, brands: alts });
  };

  if (!isOpen) return null;

  const displayList = altView ? altView.brands : results;

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.sheet}>
        <div style={S.handle} />
        <div style={S.header}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            {altView ? (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={() => setAltView(null)} style={{ ...S.closeBtn, background:'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <div>
                  <p style={S.title}>Brands for {altView.generic}</p>
                  <p style={{ fontSize:12, color:'#9ca3af', marginTop:1 }}>{altView.brands.length} brands — sorted cheapest first</p>
                </div>
              </div>
            ) : (
              <span style={S.title}>Search Medicines</span>
            )}
            <button style={S.closeBtn} onClick={onClose}><X size={16} /></button>
          </div>

          {!altView && (
            <>
              <div style={S.searchBox}>
                <Search size={18} color="#9ca3af" />
                <input
                  ref={inputRef}
                  style={S.searchInput}
                  placeholder="Brand name or generic (e.g. Napa, Paracetamol)"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setAllergyAlert(null); setPendingDrug(null); }}
                  autoComplete="off"
                />
                {query && <button onClick={() => setQuery('')} style={{ ...S.closeBtn, background:'transparent' }}><X size={14}/></button>}
              </div>
              <p style={S.resultCount}>
                {dbLoading ? 'Loading 21,714 drugs...' :
                 hasSearched && !searching ? `${results.length} result${results.length !== 1 ? 's' : ''} — tap ⇄ to compare brands` :
                 !query ? `Search ${db ? `${db.length.toLocaleString()}` : '21,714'} Bangladeshi drugs` : ''}
              </p>
            </>
          )}
        </div>

        {/* Allergy alert */}
        {allergyAlert && pendingDrug && (
          <div style={{ padding:'0 16px 8px' }}>
            <div style={{
              padding:'12px 14px', borderRadius:12,
              background: allergyAlert.severity === 'hard-stop' ? '#fee2e2' : '#fef3c7',
              border:`1.5px solid ${allergyAlert.severity === 'hard-stop' ? '#fca5a5' : '#fde68a'}`,
              color: allergyAlert.severity === 'hard-stop' ? '#991b1b' : '#713f12',
              fontFamily:'var(--font-body)', fontSize:13,
            }}>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <AlertTriangle size={16} style={{ flexShrink:0, marginTop:1 }}/>
                <div>
                  {allergyAlert.severity === 'hard-stop'
                    ? <><strong>⛔ ALLERGY ALERT:</strong> Patient allergic to <strong>{allergyAlert.allergen}</strong>. Cannot prescribe <strong>{pendingDrug.generic}</strong>.</>
                    : <><strong>⚠️ Cross-reactivity:</strong> Allergy to <strong>{allergyAlert.allergen}</strong> — possible cross-reaction.</>}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setPendingDrug(null); setAllergyAlert(null); }} style={{ flex:1, padding:'8px', borderRadius:8, border:'1.5px solid currentColor', background:'transparent', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:13, fontWeight:600, color:'inherit' }}>Cancel</button>
                {allergyAlert.severity !== 'hard-stop' && (
                  <button onClick={handleOverride} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#713f12', color:'white', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:13, fontWeight:600 }}>Add Anyway</button>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={S.list}>
          {(dbLoading || searching) ? (
            <div style={S.spinner}><div style={S.spinIcon}/>Loading database...</div>
          ) : displayList.length > 0 ? (
            <>
              {displayList.map((drug, idx) => {
                const pc = pregCatLabel(drug.pregCat);
                const allergyCheck = patientAllergies.length > 0 ? checkAllergies({ genericName: drug.generic, brandName: drug.brand }, patientAllergies) : { hit: false };
                const flagged = allergyCheck.hit;
                const isCheapest = altView && idx === 0;

                return (
                  <button key={idx} style={{ ...S.drugItem, background: flagged ? 'rgba(239,68,68,0.04)' : isCheapest ? 'rgba(16,185,129,0.04)' : 'transparent' }}
                    onClick={() => handleSelect(drug)}>
                    <div style={{ ...S.drugIcon, background: flagged ? 'rgba(239,68,68,0.12)' : isCheapest ? 'rgba(16,185,129,0.12)' : 'rgba(15,76,129,0.08)' }}>
                      <Pill size={18} color={flagged ? '#ef4444' : isCheapest ? '#10b981' : 'var(--navy)'} />
                    </div>
                    <div style={S.drugInfo}>
                      <div style={{ ...S.brandName, color: flagged ? '#991b1b' : '#1f2937' }}>
                        {drug.brand}
                        {isCheapest && <span style={{ ...S.badge, background:'#d1fae5', color:'#065f46', marginLeft:6 }}>Cheapest</span>}
                        {flagged && <span style={{ ...S.badge, background:'#fee2e2', color:'#991b1b', marginLeft:6 }}>⚠️ Allergy</span>}
                      </div>
                      <div style={S.genericRow}>
                        <span style={S.genericName}>{drug.generic}</span>
                        {drug.strength && <span style={{ ...S.badge, background:'rgba(15,76,129,0.1)', color:'var(--navy)' }}>{drug.strength}</span>}
                        {drug.form && <span style={{ ...S.badge, background:'#f3f4f6', color:'#6b7280' }}>{drug.form}</span>}
                        {showPreg && pc && <span style={{ ...S.badge, background: PREG_COLORS[drug.pregCat]+'20', color: PREG_COLORS[drug.pregCat] }}>Cat {drug.pregCat}</span>}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:3 }}>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>{drug.mfr}</span>
                        {!altView && drug.generic && (
                          <button onClick={e => handleShowAlts(e, drug)} style={{ fontSize:11, color:'var(--navy)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:'2px 6px' }}>
                            ⇄ Compare brands
                          </button>
                        )}
                      </div>
                    </div>
                    {drug.price != null && <span style={S.price}>৳{drug.price.toFixed(2)}</span>}
                    <ChevronRight size={14} color="#d1d5db" style={{ flexShrink:0 }}/>
                  </button>
                );
              })}
              {!altView && (
                <button style={S.addBtn} onClick={handleAddCustom}>
                  <Plus size={16}/>Add Custom Drug
                </button>
              )}
            </>
          ) : hasSearched ? (
            <div style={S.emptyState}>
              <div style={{ fontSize:40 }}>💊</div>
              <p style={{ fontSize:14, color:'#6b7280', textAlign:'center' }}>No results for "<strong>{query}</strong>"</p>
              <button style={{ ...S.addBtn, margin:0, width:'auto', padding:'12px 24px' }} onClick={handleAddCustom}>
                <Plus size={16}/>Add "{query}" as Custom
              </button>
            </div>
          ) : !altView ? (
            <div style={S.emptyState}>
              <div style={{ fontSize:40 }}>🔍</div>
              <p style={{ fontSize:14, color:'#6b7280', textAlign:'center' }}>
                Search by brand (e.g. "Napa") or generic (e.g. "Paracetamol", "Azithromycin")
              </p>
              {db && <p style={{ fontSize:12, color:'#9ca3af' }}>{db.length.toLocaleString()} drugs ready</p>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function normalizeDrug(d) {
  return {
    brandName:  d.brand   || d.brandName  || '',
    genericName:d.generic || d.genericName|| '',
    strength:   d.strength || '',
    dosageForm: d.form    || d.dosageForm  || 'Tablet',
    manufacturer:d.mfr   || d.manufacturer|| '',
    price:      d.price   != null ? d.price : null,
    pregCat:    d.pregCat || '',
    drugClass:  d.drugClass|| '',
    isCustom:   false,
  };
}
