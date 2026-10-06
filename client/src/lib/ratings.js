// Critic scores (Metacritic Metascore + critic review count), keyed like thumbnails.
// Built by .github/workflows/ratings.yml into ratings/scores.json and bundled.
import scores from '../../../ratings/scores.json';
import { tokenize, displayTitle } from '@matching/normalize.js';

const EDITION = new Set(['standard', 'deluxe', 'ultimate', 'gold', 'premium', 'launch', 'day', 'one', 'complete',
  'definitive', 'special', 'limited', 'collector', 'collectors', 'anniversary', 'goty', 'edition', 'ed', 'bundle']);

export function getRating(title) {
  const tokens = tokenize(displayTitle(title || ''));
  if (!tokens.length) return null;
  const key = tokens.join(' ');
  const base = tokens.filter((t) => !EDITION.has(t)).join(' ');
  const r = scores[key] || scores[base];
  if (!r || !r.score) return null;
  return { ...r, stars: Math.round(r.score / 10) / 2 }; // 0–100 -> 0–5 in half stars
}
