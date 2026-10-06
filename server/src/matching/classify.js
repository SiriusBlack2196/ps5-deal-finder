// Classifies a raw store listing: is it a game? which platform? condition? edition?
// `hints` are store-provided signals (WooCommerce categories, Shopify product_type/tags,
// variant titles) which are more reliable than parsing the title alone.

const has = (re, ...texts) => texts.some((t) => t && re.test(t));

// ---------- platform ----------
const RE_PS5 = /\b(ps\s?5|playstation\s?5|play\s?station\s?5)\b/i;
const RE_PS4 = /\b(ps\s?4|playstation\s?4|play\s?station\s?4)\b/i;
const RE_PS4_UPGRADE = /\bps\s?4\b.*\b(free|with|incl\w*)\b.*\bps\s?5\s*upgrade\b|\bps\s?5\s*upgrade\s*(available|included)\b|\bfree\s*ps\s?5\s*upgrade\b/i;
const RE_XBOX = /\bxbox\b|\bseries\s?[xs]\b/i;
const RE_SWITCH = /\b(nintendo\s*)?switch\b/i;
const RE_PC = /\b(pc|steam|windows)\b(?!\s*(engine|ports?))/i;

export function detectPlatform(title, hintText = '') {
  if (RE_PS4_UPGRADE.test(title)) return 'ps4-ps5-upgrade';
  const t5 = RE_PS5.test(title), t4 = RE_PS4.test(title);
  if (t5 && !t4) return 'ps5';
  if (t4 && t5) return 'ps4-and-ps5'; // e.g. "PS4/PS5" bundles; treated as non-PS5-specific
  if (t4) return 'ps4';
  if (RE_XBOX.test(title)) return 'xbox';
  if (RE_SWITCH.test(title)) return 'switch';
  if (/\bpc\b/i.test(title)) return 'pc';
  // Title silent -> trust the store's category/type.
  if (RE_PS5.test(hintText) && !RE_PS4.test(hintText)) return 'ps5';
  if (RE_PS4.test(hintText) && !RE_PS5.test(hintText)) return 'ps4';
  if (RE_XBOX.test(hintText)) return 'xbox';
  if (RE_SWITCH.test(hintText)) return 'switch';
  if (RE_PC.test(hintText)) return 'pc';
  return 'unknown';
}

// ---------- kind (game vs everything else) ----------
const RE_CONSOLE = /^\s*sony\s+play\s?station\s?5\b|\bconsole\b|\b(ps5|playstation\s?5)\s*(slim|pro|digital|disc)(\s*edition)?\b(?!.*\bgame\b)|\bplaystation\s?portal\b/i;
const RE_ACCESSORY = /\b(controller|dual\s?sense|dual\s?shock|joystick|headset|headphone|earbuds?|charg(er|ing)|dock|stand|cover|skin|case|pouch|cable|adapter|hdmi|ssd|nvme|hard\s?drive|camera|remote|keyboard|mouse|mouse\s?pad|grip|thumb\s?grips?|faceplate|cooling|fan|vertical)\b/i;
const RE_MERCH = /\b(funko|figure|figurine|statue|mug|poster|t-?shirt|hoodie|cap|keychain|key\s?chain|art\s?book|plush|lamp|collectible|amiibo|steelbook\s*only|no\s+game\s+included|game\s+not\s+included|without\s+(the\s+)?game)\b/i;
const RE_DIGITAL = /\b(code\s*only|no\s*disc|digital\s*(code|download|voucher|key)|voucher|psn|wallet|gift\s*card|top-?up|redeem|membership|plus\s*(essential|extra|premium))\b/i;
const RE_DLC = /\b(dlc|season\s*pass|add-?on|expansion\s*pass|currency|points|coins)\b/i;

const NON_GAME_HINTS = /\b(consoles?|accessor(y|ies)|controllers?|collectibles?|merch|psn|wallet|digital|gift|headsets?|rare and collectible|pc components)\b/i;
const GAME_HINTS = /\bgames?\b/i;

// Notes about what is NOT in the box ("(No DLC)", "(No OST/Artbook)", "w/Artbook")
// describe a game disc, so they must not make it look like DLC or merch.
const RE_BOX_NOTES = /\(\s*no\s+(?!game)[^)]*\)|\bw\/\s*art\s?book\b/gi;
// Store-internal notes like "** USE 8904171334143**" mark duplicate/retired listings.
const RE_INTERNAL_NOTE = /\*\*\s*use\b/i;

export function detectKind(rawTitle, hintText = '') {
  if (RE_INTERNAL_NOTE.test(rawTitle)) return 'other';
  const title = String(rawTitle || '').replace(RE_BOX_NOTES, ' ');
  if (RE_CONSOLE.test(title)) return 'console';
  if (RE_DIGITAL.test(title)) return 'digital';
  if (RE_MERCH.test(title)) return 'merch';
  if (RE_DLC.test(title)) return 'dlc';
  if (RE_ACCESSORY.test(title) && !GAME_HINTS.test(hintText)) return 'accessory';
  if (NON_GAME_HINTS.test(hintText) && !GAME_HINTS.test(hintText)) return 'other';
  return 'game';
}

// ---------- condition ----------
const RE_PREOWNED = /\b(pre[\s-]?owned|preowned|used|second[\s-]?hand|refurb(ished)?|open[\s-]?box)\b/i;
export function detectCondition(...texts) {
  return has(RE_PREOWNED, ...texts) ? 'preowned' : 'new';
}

// Shopify "BUYBACK (SELL)" style variants are what the store pays YOU. Never a deal.
const RE_BUYBACK = /\b(buy\s?back|sell(\s+to\s+us)?|trade[\s-]?in|exchange\s*offer)\b/i;
export function isBuyback(text) {
  return RE_BUYBACK.test(text || '');
}

// ---------- edition ----------
const EDITIONS = [
  ['Collector\'s', /\bcollector'?s?\b/i],
  ['Ultimate', /\bultimate\b|\bult\.?\s*edition\b|\bult\b/i],
  ['Deluxe', /\bdeluxe\b/i],
  ['Gold', /\bgold\b/i],
  ['GOTY', /\b(game\s+of\s+the\s+year|goty)\b/i],
  ['Complete', /\bcomplete\b/i],
  ['Definitive', /\bdefinitive\b/i],
  ['Premium', /\bpremium\b/i],
  ['Launch', /\blaunch\b/i],
  ['Limited', /\blimited\b/i],
  ['Special', /\bspecial\b/i],
];
export function detectEdition(...texts) {
  for (const [name, re] of EDITIONS) if (has(re, ...texts)) return name;
  return 'Standard';
}
