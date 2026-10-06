import cgLogo from '../assets/logos/consolegarage.png';
import gnLogo from '../assets/logos/gamenation.png';
import e2zLogo from '../assets/logos/e2z.png';
import glLogo from '../assets/logos/gameloot.png';

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹4,999 / ₹1,24,999 (Indian grouping) */
export const inr = (n) => '₹' + inrFmt.format(Math.round(n));

export function timeAgo(iso, now = Date.now()) {
  if (!iso) return '';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

// Logos are bundled (the artifact build can't load images from store servers).
// `tile` is the badge background the logo sits on.
export const STORE_STYLE = {
  gameloot: { logo: glLogo, tile: '#fff', mono: 'GL', bg: '#CB0201', fg: '#fff', domain: 'gameloot.in' },
  consolegarage: { logo: cgLogo, tile: '#fff', mono: 'CG', bg: '#1A80C4', fg: '#fff', domain: 'consolegarage.com' },
  gamenation: { logo: gnLogo, tile: '#fff', mono: 'GN', bg: '#1F7A33', fg: '#fff', domain: 'gamenation.in' },
  e2z: { logo: e2zLogo, tile: '#000', mono: 'E2Z', bg: '#000', fg: '#FFC800', domain: 'e2zstore.com' },
  amazon: { mono: 'a', bg: '#232F3E', fg: '#FF9900', domain: 'amazon.in' },
  flipkart: { mono: 'F', bg: '#2874F0', fg: '#FFE11B', domain: 'flipkart.com' },
};
