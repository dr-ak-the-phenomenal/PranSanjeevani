import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export const DEFAULT_SETTINGS = {
  doctorName: 'Dr. Anup Kumar Paul',
  degrees: 'MBBS (Dhaka)',
  designation: 'Ex-Lecturer of Pharmacology',
  institution: 'Diabetic Association Medical College & Hospital (DAMCH), Faridpur',
  bmdc: 'A-128735',
  chamberName: 'My Chamber',
  chamberAddress: '',
  phone: '',
  bkashNumber: '01937242869',
  consultationFee: 500,
  followUpFee: 300,
  workingDays: { sat: true, sun: true, mon: true, tue: true, wed: true, thu: true, fri: false },
  morningEnabled: true,
  morningStart: '09:00',
  morningEnd: '13:00',
  eveningEnabled: true,
  eveningStart: '17:00',
  eveningEnd: '21:00',
  maxPatientsPerSession: 30,
  prescriptionFooter: 'Take rest. Drink plenty of water. Follow a healthy diet. Avoid self-medication.',
  showInstitution: true,
  showBMDC: true,
};

export function SettingsProvider({ children }) {
  const { user, isDoctor } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isDoctor) {
      setSettingsLoading(false);
      return;
    }

    const ref = doc(db, 'settings', 'doctor');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
      }
      setSettingsLoading(false);
    }, () => {
      setSettingsLoading(false);
    });

    return unsub;
  }, [user, isDoctor]);

  const saveSettings = async (newSettings) => {
    const ref = doc(db, 'settings', 'doctor');
    await setDoc(ref, newSettings, { merge: true });
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, settingsLoading, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider');
  return ctx;
}
