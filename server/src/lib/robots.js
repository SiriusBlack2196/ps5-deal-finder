// Minimal robots.txt support: groups for our UA token or "*", Allow/Disallow
// with "*" and "$" wildcards, longest-match wins (Google semantics).
// If robots.txt can't be fetched we allow (standard crawler behaviour).

const CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map(); // origin -> { at, rules }

export function parseRobots(text, uaToken = 'lowscore') {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!current) continue;
      if ((key === 'allow' || key === 'disallow') && val) current.rules.push({ allow: key === 'allow', path: val });
    }
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && uaToken.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  return chosen.flatMap((g) => g.rules);
}

function ruleToRegex(p) {
  const anchored = p.endsWith('$');
  const body = (anchored ? p.slice(0, -1) : p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + body + (anchored ? '$' : ''));
}

export function isPathAllowed(rules, pathAndQuery) {
  let best = null;
  for (const r of rules) {
    if (ruleToRegex(r.path).test(pathAndQuery)) {
      if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
    }
  }
  return best ? best.allow : true;
}

export async function isAllowedByRobots(url, userAgent, fetchText) {
  const origin = url.origin;
  let entry = cache.get(origin);
  if (!entry || Date.now() - entry.at > CACHE_TTL) {
    let rules = [];
    try {
      const text = await fetchText(origin + '/robots.txt', AbortSignal.timeout(3000));
      if (text) rules = parseRobots(text, userAgent.toLowerCase());
    } catch { /* unreachable robots.txt => allow */ }
    entry = { at: Date.now(), rules };
    cache.set(origin, entry);
  }
  return isPathAllowed(entry.rules, url.pathname + url.search);
}
