// Turns a store title or a user query into a bag of comparable tokens.
//   "Marvel’s Spider-Man 2 PS5 (Pre-owned)"  -> ["spiderman", "2"]
//   "EA Sports FC 25 PS5"                    -> ["fc", "25"]
//   "God Of War Ragnarok PS5"                -> ["god", "war", "ragnarok"]

const ROMAN = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9' };

// Common abbreviations users type.
const ALIASES = [
  [/\bgow\b/g, 'god of war'],
  [/\bgta\b/g, 'grand theft auto'],
  [/\bcod\b/g, 'call of duty'],
  [/\brdr\s?2\b/g, 'red dead redemption 2'],
  [/\bac\b(?=\s+\w)/g, 'assassins creed'],
  [/\bfifa\s?(2[5-9])\b/g, 'fc $1'], // people still say "FIFA 25"
  [/\bfc\s?(2\d)\b/g, 'fc $1'],      // "fc25" -> "fc 25"
];

// Phrases removed before tokenizing (platform names, publishers, packaging).
const PHRASES = [
  /\bplay\s?station\s?[45]\b/g,
  /\bps\s?[45]\b/g,
  /\bps\s?vr\s?2?\b/g,
  /\bea\s+sports\b/g,
  /\bsony\s+(interactive|india)\b/g,
  /\bwith\s+free\s+.*\bupgrade\b/g,
  /\b(pre[\s-]?owned|second[\s-]?hand|open[\s-]?box)\b/g,
  /\bgame\s+of\s+the\s+year\b/g,
  /\bcollector'?s?\b/g,
  /\bstandard\s+edition\b/g,
];

// Single tokens that never distinguish one game from another.
const NOISE = new Set([
  // platform / packaging
  'ps', 'playstation', 'disc', 'disk', 'physical', 'game', 'games', 'video', 'version', 'edition', 'bundle',
  'india', 'indian', 'eu', 'uk', 'us', 'asia', 'asian', 'pal', 'import', 'imported', 'english', 'region', 'r2', 'free',
  // condition
  'new', 'used', 'preowned', 'refurbished', 'sealed',
  // edition words (detected separately)
  'standard', 'deluxe', 'ultimate', 'ult', 'gold', 'goty', 'complete', 'definitive', 'premium', 'launch',
  'limited', 'special', 'digital', 'steelbook',
  // brands / publishers that some stores include and others don't
  'marvel', 'marvels', 'ea', 'sony', 'official', 'ubisoft', 'tom', 'clancys',
  // stopwords
  'the', 'a', 'an', 'of', 'and', 'for', 'with', 'in', 'on', 'to',
]);

export function cleanText(s) {
  let t = String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // ragnarök -> ragnarok
    .toLowerCase()
    .replace(/\(\s*no\s+(?!game)[^)]*\)/g, ' ') // CeX box notes: "(No DLC)", "(No OST/Artbook)"
    .replace(/\*\*.*?\*\*/g, ' ')            // store-internal notes
    .replace(/[’'`´]/g, '')        // marvel’s -> marvels
    .replace(/&/g, ' and ')
    .replace(/(\p{L})-(\p{L})/gu, '$1$2'); // spider-man -> spiderman, x-men -> xmen
  for (const [re, rep] of ALIASES) t = t.replace(re, rep);
  for (const re of PHRASES) t = t.replace(re, ' ');
  return t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Text to send to a store's own search box. Stores do literal substring
 * matching, so keep the user's spelling (hyphens etc.), only drop platform
 * words and publisher prefixes that store titles often omit.
 */
export function storeSearchTerm(query) {
  return String(query || '')
    .replace(/\bplay\s?station\s?[45]\b|\bps\s?[45]\b/gi, ' ')
    .replace(/\bea\s+sports\b|\bea\b/gi, ' ')
    .replace(/\bmarvel'?s?\b|\bmarvel’s\b/gi, ' ')
    .replace(/[()[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(s) {
  return cleanText(s)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ROMAN[w] || w)
    .filter((w) => !NOISE.has(w));
}

/** Canonical key used to group the same game across stores. */
export function gameKey(tokens) {
  return tokens.join(' ');
}

const ACRONYMS = new Set(['fc', 'fifa', 'gta', 'nba', 'nfl', 'nhl', 'mlb', 'wwe', 'ufc', 'pga', 'ea', 'dlc', 'goty', 'vr', 'ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix', 'xi', 'xii', 'xv', 'xvi', 'hd', 'mgs']);
const SMALL = new Set(['a', 'an', 'of', 'the', 'and', 'in', 'on', 'to', 'for']);
/** Pretty title for display / autocomplete, derived from the cleanest store title. */
export function displayTitle(rawTitle) {
  let t = String(rawTitle || '')
    .replace(/\((pre[\s-]?owned|used|new|standard edition)\)/gi, '')
    .replace(/\(\s*no\s+(?!game)[^)]*\)/gi, '')
    .replace(/\b(ps\s?5|playstation\s?5)\b/gi, '')
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/\s*[-–|]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (t === t.toUpperCase() || t === t.toLowerCase()) {
    t = t.split(' ').map((w, i) => {
      const lw = w.toLowerCase();
      if (ACRONYMS.has(lw) || /\d/.test(w)) return w.toUpperCase();
      if (i > 0 && SMALL.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    }).join(' ');
  } else {
    // Mixed-case store titles: just lowercase small joining words ("God Of War" -> "God of War").
    // Also restore acronyms a store wrote in title case ("Nba 2K22" -> "NBA 2K22", "Fifa" -> "FIFA").
    t = t.split(' ').map((w, i) => {
      if (ACRONYMS.has(w.toLowerCase()) && /^[A-Z][a-z]+$/.test(w)) return w.toUpperCase();
      return i > 0 && SMALL.has(w.toLowerCase()) && /^[A-Z][a-z]*$/.test(w) ? w.toLowerCase() : w;
    }).join(' ');
  }
  return t.trim();
}
