import { format, isToday, isYesterday, parseISO } from 'date-fns';

// Date formatting
export const formatDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy');
};

export const formatDateLong = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE, dd MMMM yyyy');
};

export const todayString = () => format(new Date(), 'yyyy-MM-dd');

export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
};

export const formatRelativeDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM');
};

// Prescription number: YYYYMMDD-XXX
export const generatePrescriptionId = (count) => {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const num = String(count + 1).padStart(3, '0');
  return `${dateStr}-${num}`;
};

// Strip HTML tags from Medex descriptions
export const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
};

// Parse price from Medex format "100 ml bottle: ৳ 40.12"
export const parsePrice = (priceStr) => {
  if (!priceStr) return null;
  const match = priceStr.match(/৳\s*([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
};

// Format currency
export const formatTaka = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `৳${Number(amount).toLocaleString('en-IN')}`;
};

// Age display
export const formatAge = (age, sex) => {
  if (!age) return '';
  const ageStr = `${age}y`;
  return sex ? `${ageStr} / ${sex}` : ageStr;
};

// Get today's greeting
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Generate unique patient ID
export const generatePatientId = () => {
  return `PT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
};

// Sex short form
export const sexShort = (sex) => {
  if (!sex) return '';
  return sex.charAt(0).toUpperCase();
};

// Chronic condition colors
export const conditionColor = (condition) => {
  const map = {
    DM: 'badge-yellow',
    HTN: 'badge-red',
    Asthma: 'badge-blue',
    CKD: 'badge-navy',
    IHD: 'badge-red',
    COPD: 'badge-blue',
    Epilepsy: 'badge-navy',
    Hypothyroid: 'badge-yellow',
    'Liver Disease': 'badge-yellow',
    Cancer: 'badge-red',
  };
  return map[condition] || 'badge-gray';
};
