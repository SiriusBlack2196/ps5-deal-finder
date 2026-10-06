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

export const STORE_STYLE = {
  gameloot: { mono: 'GL', bg: '#2F4BCC', fg: '#fff', domain: 'gameloot.in' },
  consolegarage: { mono: 'CG', bg: '#C2410C', fg: '#fff', domain: 'consolegarage.com' },
  gamenation: { mono: 'GN', bg: '#0F766E', fg: '#fff', domain: 'gamenation.in' },
  e2z: { mono: 'E2Z', bg: '#18203A', fg: '#FFD23F', domain: 'e2zstore.com' },
  amazon: { mono: 'a', bg: '#232F3E', fg: '#FF9900', domain: 'amazon.in' },
  flipkart: { mono: 'F', bg: '#2874F0', fg: '#FFE11B', domain: 'flipkart.com' },
};
