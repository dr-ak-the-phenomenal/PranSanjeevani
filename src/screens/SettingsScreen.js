import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatTaka } from '../utils/helpers';

const TABS = ['Profile', 'Chamber', 'Schedule', 'Payment', 'Rx'];
const DAYS = [
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
];
const CONDITIONS = ['DM', 'HTN', 'Asthma', 'CKD', 'IHD', 'COPD', 'Epilepsy', 'Hypothyroid', 'Liver Disease', 'Cancer'];

export default function SettingsScreen() {
  const { settings, saveSettings } = useSettings();
  const { logout } = useAuth();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setDay = (day) => setForm(f => ({
    ...f,
    workingDays: { ...f.workingDays, [day]: !f.workingDays?.[day] }
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
        padding: '20px 20px 0',
        color: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          Settings
        </h1>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                background: 'none',
                border: 'none',
                color: tab === i ? 'white' : 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: tab === i ? 700 : 500,
                padding: '8px 14px',
                cursor: 'pointer',
                borderBottom: tab === i ? '2px solid white' : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>

        {/* ── PROFILE TAB ── */}
        {tab === 0 && (
          <div className="fade-in">
            {/* Letterhead Preview */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              border: '1px solid var(--gray-100)',
              boxShadow: 'var(--shadow-card)',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--navy)', fontWeight: 700 }}>
                {form.doctorName || 'Doctor Name'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{form.degrees}</p>
              {form.showInstitution && (
                <p style={{ fontSize: 11, color: 'var(--gray-500)' }}>{form.designation}, {form.institution}</p>
              )}
              {form.showBMDC && (
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>BM&DC Reg: {form.bmdc}</p>
              )}
            </div>

            <Field label="Full Name" value={form.doctorName} onChange={v => set('doctorName', v)} />
            <Field label="Degrees" value={form.degrees} onChange={v => set('degrees', v)} placeholder="e.g. MBBS, MD" />
            <Field label="Designation" value={form.designation} onChange={v => set('designation', v)} />
            <Field label="Institution" value={form.institution} onChange={v => set('institution', v)} />
            <Field label="BM&DC Registration No" value={form.bmdc} onChange={v => set('bmdc', v)} />

            <div style={{ marginBottom: 14 }}>
              <ToggleRow
                label="Show Institution on Prescription"
                value={form.showInstitution}
                onChange={v => set('showInstitution', v)}
              />
              <ToggleRow
                label="Show BM&DC on Prescription"
                value={form.showBMDC}
                onChange={v => set('showBMDC', v)}
              />
            </div>
          </div>
        )}

        {/* ── CHAMBER TAB ── */}
        {tab === 1 && (
          <div className="fade-in">
            <Field label="Chamber Name" value={form.chamberName} onChange={v => set('chamberName', v)} placeholder="e.g. Paul Medical Centre" />
            <Field label="Chamber Address" value={form.chamberAddress} onChange={v => set('chamberAddress', v)} placeholder="Full address" multiline />
            <Field label="Contact Phone" value={form.phone} onChange={v => set('phone', v)} placeholder="01XXXXXXXXX" type="tel" />

            <div style={{
              background: 'rgba(15,76,129,0.06)',
              borderRadius: 12,
              padding: 14,
              marginBottom: 14,
            }}>
              <p style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>Chamber Preview</p>
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 6 }}>
                {form.chamberName || '—'}<br/>
                {form.chamberAddress || '—'}<br/>
                📞 {form.phone || '—'}
              </p>
            </div>
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {tab === 2 && (
          <div className="fade-in">
            <p className="input-label" style={{ marginBottom: 10 }}>Working Days</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {DAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => setDay(d.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 13,
                    background: form.workingDays?.[d.key] ? 'var(--navy)' : 'var(--gray-100)',
                    color: form.workingDays?.[d.key] ? 'white' : 'var(--gray-500)',
                    transition: 'all 0.2s',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Morning session */}
            <div style={{ background: 'white', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid var(--gray-100)' }}>
              <ToggleRow
                label="Morning Session"
                value={form.morningEnabled}
                onChange={v => set('morningEnabled', v)}
              />
              {form.morningEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  <div>
                    <label className="input-label">Start</label>
                    <input className="input-field" type="time" value={form.morningStart} onChange={e => set('morningStart', e.target.value)} />
                  </div>
                  <div>
                    <label className="input-label">End</label>
                    <input className="input-field" type="time" value={form.morningEnd} onChange={e => set('morningEnd', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Evening session */}
            <div style={{ background: 'white', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid var(--gray-100)' }}>
              <ToggleRow
                label="Evening Session"
                value={form.eveningEnabled}
                onChange={v => set('eveningEnabled', v)}
              />
              {form.eveningEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  <div>
                    <label className="input-label">Start</label>
                    <input className="input-field" type="time" value={form.eveningStart} onChange={e => set('eveningStart', e.target.value)} />
                  </div>
                  <div>
                    <label className="input-label">End</label>
                    <input className="input-field" type="time" value={form.eveningEnd} onChange={e => set('eveningEnd', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <Field label="Max Patients Per Session" value={String(form.maxPatientsPerSession || 30)} onChange={v => set('maxPatientsPerSession', parseInt(v) || 30)} type="number" />
          </div>
        )}

        {/* ── PAYMENT TAB ── */}
        {tab === 3 && (
          <div className="fade-in">
            <Field label="Consultation Fee (৳)" value={String(form.consultationFee || '')} onChange={v => set('consultationFee', parseFloat(v) || 0)} type="number" />
            <Field label="Follow-up Fee (৳)" value={String(form.followUpFee || '')} onChange={v => set('followUpFee', parseFloat(v) || 0)} type="number" />
            <Field label="bKash Number" value={form.bkashNumber} onChange={v => set('bkashNumber', v)} placeholder="01XXXXXXXXX" type="tel" />

            <div style={{
              background: 'linear-gradient(135deg, #c9a84c, #e8c96e)',
              borderRadius: 12,
              padding: 16,
              color: 'white',
              marginTop: 8,
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>Fee Summary</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div>
                  <p style={{ fontSize: 11, opacity: 0.8 }}>New Patient</p>
                  <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                    {formatTaka(form.consultationFee)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, opacity: 0.8 }}>Follow-up</p>
                  <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                    {formatTaka(form.followUpFee)}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>bKash: {form.bkashNumber || '—'}</p>
            </div>
          </div>
        )}

        {/* ── RX SETTINGS TAB ── */}
        {tab === 4 && (
          <div className="fade-in">
            <div className="input-group">
              <label className="input-label">Prescription Footer / Advice</label>
              <textarea
                className="input-field"
                rows={4}
                value={form.prescriptionFooter}
                onChange={e => set('prescriptionFooter', e.target.value)}
                placeholder="Standard advice to print on every prescription"
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: -8, marginBottom: 16 }}>
              This text appears at the bottom of every prescription.
            </p>

            <div style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid var(--gray-100)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>
                Preview Footer
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', fontStyle: 'italic', lineHeight: 1.6 }}>
                {form.prescriptionFooter || 'No footer set'}
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ marginTop: 24 }}>
          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : '💾 Save Settings'}
          </button>
        </div>

        {/* Logout */}
        <button
          className="btn btn-secondary btn-full"
          style={{ marginTop: 10 }}
          onClick={() => { if (window.confirm('Log out?')) logout(); }}
        >
          Logout
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', marginTop: 20 }}>
          Pran Sanjeevani v1.0 · Pran Sanjeevani Medical
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {multiline ? (
        <textarea
          className="input-field"
          rows={3}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="input-field"
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: 14, color: 'var(--gray-700)', fontWeight: 500 }}>{label}</span>
      <label className="toggle-switch">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
