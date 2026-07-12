#!/usr/bin/env node
// skill-match.mjs — CLI skill router: task text -> top-N matching skills.
// Thin BM25-ranked matcher over your local skills. No npm dependencies.
//
// Discovery: pass an explicit manifest (JSON: {skills:[{name,path,description}]} or a
// flat array) via --manifest/SKILLS_MANIFEST if you maintain one; otherwise this tool
// auto-discovers skills by scanning standard directories for `*/SKILL.md` and reading
// their frontmatter (name + description) — zero configuration needed for a normal
// Claude Code / plugin setup.
//
// Output format: name · score · path · a one-shot command to read the instructions
// (cat .../SKILL.md). Different hosts/engines may be in play, so this tool never
// activates a skill on your behalf — it only points at the instructions; activation
// stays with the calling agent/host.

import { readFileSync, writeFileSync, appendFileSync, statSync, realpathSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── BEGIN BM25 (adapted from the samemind project's bm25 lib — github.com/alexgrebeshok-coder/samemind) ───
// Kept as a small inlined copy so this tool has zero dependencies and works standalone.
const TOKEN_RE = /[^\p{L}\p{N}-]+/u;
// Light Russian stemmer: common suffixes are stripped down to a >=3-char stem — so
// "презентацию"/"презентация"/"презентации" collapse to one stem. Cyrillic only, latin
// untouched. Applied identically to the index and the query (inside tokenize) — otherwise
// stems wouldn't line up.
const RU_SUFFIX = /(иями|ями|ами|иях|ях|ах|ов|ев|ей|ий|ый|ой|ая|яя|ое|ее|ые|ие|ует|уют|ить|ыть|ать|ять|еть|ла|ло|ли|ем|ом|ам|ям|ся|сь|ть|у|ю|а|я|о|е|ы|и|ь)$/;
function stemRu(t) {
  if (!/[а-яё]/.test(t)) return t;
  const base = t.replace(RU_SUFFIX, '');
  return base.length >= 3 ? base : t;
}
function tokenize(text) {
  return (text || '').toLowerCase().split(TOKEN_RE).filter(t => t.length >= 2).map(stemRu);
}
function buildCorpus(docs, opt) {
  const textOf = (opt && opt.textOf) || (d => String(d));
  const df = new Map(), docTf = new Map(), docLen = new Map();
  let totalLen = 0;
  for (const d of docs) {
    const tokens = tokenize(textOf(d));
    docLen.set(d.id, tokens.length);
    totalLen += tokens.length;
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    docTf.set(d.id, tf);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = docs.length;
  const avgdl = N ? totalLen / N : 0;
  return { df: df, docTf: docTf, docLen: docLen, N: N, avgdl: avgdl };
}
function idf(corpus, term) {
  const df = corpus.df.get(term) || 0;
  return Math.log((corpus.N - df + 0.5) / (df + 0.5) + 1);
}
function bm25Score(query, docId, corpus, opt) {
  const k1 = (opt && opt.k1) || 1.2;
  const b = (opt && opt.b != null) ? opt.b : 0.75;
  const tf = corpus.docTf.get(docId);
  if (!tf || !corpus.avgdl) return 0;
  const dl = corpus.docLen.get(docId) || 0;
  const lenNorm = k1 * (1 - b + b * (dl / corpus.avgdl));
  let score = 0;
  for (const t of tokenize(query)) {
    const f = tf.get(t);
    if (!f) continue;
    score += (idf(corpus, t) * (f * (k1 + 1))) / (f + lenNorm);
  }
  return score;
}
// ─── END BM25 ──────────────────────────────────────────────────────────────────────────

// Where this tool keeps its own state (cache / usage log) when the caller doesn't
// override via env — a dotfile cache dir, not tied to any particular host layout.
const STATE_DIR = resolve(process.env.HOME, '.cache', 'skill-match');
const RICH_CACHE = resolve(process.env.HOME, '.cache', 'skill-match', 'cache.json');
const USAGE_LOG = resolve(process.env.HOME, '.cache', 'skill-match', 'usage.jsonl');
function ensureStateDir() { try { mkdirSync(STATE_DIR, { recursive: true }); } catch { /* best effort */ } }

// Parse just enough of a SKILL.md frontmatter to get name + description.
function parseFrontmatter(raw) {
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const nameM = fm[1].match(/^name:\s*(.+)$/m);
  const descBlock = fm[1].match(/description:\s*>?-?\s*\n?([\s\S]*?)(?=\n[a-zA-Z_-]+:|$)/);
  const descLine = fm[1].match(/^description:\s*(.+)$/m);
  const description = (descBlock && descBlock[1].trim()) ? descBlock[1] : (descLine ? descLine[1] : '');
  return { name: nameM ? nameM[1].trim() : null, description: description.replace(/\s+/g, ' ').trim() };
}

// Auto-discovery: scan standard skill directories for `*/SKILL.md`. Roots, in order:
// $SKILLS_DIRS (colon-separated, highest priority), ~/.claude/skills (the common Claude
// Code personal skills dir), and this marketplace's own skills/ folder (so `skill-match`
// works out of the box even for someone who just cloned the repo without installing).
function discoverSkillDirs() {
  const roots = [];
  if (process.env.SKILLS_DIRS) roots.push(...process.env.SKILLS_DIRS.split(':').filter(Boolean));
  roots.push(resolve(process.env.HOME, '.claude', 'skills'));
  try {
    const hereDir = dirname(fileURLToPath(import.meta.url)); // .../skills/skill-lifecycle/tools
    roots.push(resolve(hereDir, '..', '..')); // .../skills
  } catch { /* import.meta unavailable — skip self-discovery */ }

  const seen = new Set();
  const skills = [];
  for (const root of roots) {
    let entries;
    try { entries = readdirSync(root, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = resolve(root, e.name);
      if (seen.has(dir)) continue;
      try {
        const raw = readFileSync(resolve(dir, 'SKILL.md'), 'utf8');
        const fm = parseFrontmatter(raw);
        if (fm && fm.name) { skills.push({ name: fm.name, path: dir, description: fm.description }); seen.add(dir); }
      } catch { /* no SKILL.md here — not a skill dir */ }
    }
  }
  return skills;
}

// Load skills either from an explicit manifest (if you maintain one — supports both
// {skills:[...]} and a flat array) or, by default, via auto-discovery.
export function loadSkills(manifestPath) {
  const p = manifestPath || process.env.SKILLS_MANIFEST;
  if (p) {
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    const skills = Array.isArray(raw) ? raw : raw.skills;
    return skills.filter(s => s && s.name && s.path);
  }
  return discoverSkillDirs();
}

// Enrichment: pull the FULL frontmatter description from SKILL.md (that's where the
// triggers live — "Use when…") — a manifest, if used, may only hold a short line.
// mtime-keyed cache so files aren't re-read on every call. Cache miss (no file/perms) —
// silent fallback to whatever description was already loaded.
export function enrichSkills(skills, cachePath) {
  const cp = cachePath || process.env.SKILL_MATCH_CACHE || RICH_CACHE;
  let cache = {};
  try { cache = JSON.parse(readFileSync(cp, 'utf8')); } catch { /* no cache yet — build it */ }
  let dirty = false;
  const out = skills.map(s => {
    let rich = s.description || '';
    try {
      const md = s.path + '/SKILL.md';
      const mt = statSync(md).mtimeMs;
      const hit = cache[s.name];
      if (hit && hit.mt === mt) {
        rich = hit.rich;
      } else {
        const raw = readFileSync(md, 'utf8');
        const fm = parseFrontmatter(raw);
        rich = (fm && fm.description ? fm.description : rich).slice(0, 700);
        cache[s.name] = { mt: mt, rich: rich };
        dirty = true;
      }
    } catch { /* SKILL.md unreachable — stay with whatever description we had */ }
    return { ...s, rich: rich };
  });
  if (dirty) { ensureStateDir(); try { writeFileSync(cp, JSON.stringify(cache)); } catch { /* cache is non-critical */ } }
  return out;
}

// RU<->EN bridges for common domain terms: not a translator, just ~30 pairs so a
// Russian-language query finds an English-described skill (and vice versa). Group
// tokens get appended to the query when any member of the group is present.
const BRIDGES = [
  ['excel', 'xlsx', 'таблица', 'таблицу', 'spreadsheet'],
  ['документ', 'docx', 'word', 'письмо', 'справка'],
  ['презентация', 'pptx', 'слайды', 'deck', 'слайд'],
  ['pdf', 'пдф'],
  ['память', 'memory', 'вспомни', 'запомни', 'recall'],
  ['скилл', 'skill', 'навык', 'skills'],
  ['карта', 'map', 'гео', 'geodata', 'геоданные', 'высоты'],
  ['агент', 'agent', 'агентов', 'subagent', 'оркестрация', 'orchestration'],
  ['цикл', 'loop', 'зациклить', 'крутить'],
  ['проверка', 'verify', 'приёмка', 'review', 'ревью'],
  ['баг', 'bug', 'debug', 'отладка', 'сломалось', 'ошибка'],
  ['безопасность', 'security', 'секрет', 'секреты', 'audit', 'аудит'],
  ['тест', 'test', 'тесты', 'tdd', 'testing'],
  ['план', 'plan', 'планирование', 'planning', 'стратегия'],
  ['финансы', 'финансовый', 'financial', 'dcf', 'валюация'],
  ['бриф', 'brief', 'сводка', 'дайджест'],
  ['летопись', 'worklog', 'журнал', 'ledger'],
  ['релиз', 'release', 'publish', 'публикация', 'ship'],
  ['голос', 'voice', 'аудио', 'audio', 'диктовка'],
  ['эксель', 'excel', 'xlsx'],
  ['пэдээф', 'пдф', 'pdf'],
  ['график', 'диаграмма', 'chart', 'визуализация', 'dataviz', 'plot', 'dashboard'],
  ['стоимость', 'оценка', 'потоки', 'dcf', 'valuation', 'финансовый'],
  ['упало', 'сломалось', 'падает', 'debug', 'починить', 'fix', 'ошибка', 'diagnos'],
  ['схема', 'diagram', 'структура', 'канвас', 'canvas'],
  ['исследование', 'research', 'изучи', 'разведка'],
];
export function expandQuery(query) {
  // tokenize stems — group words are compared through stemRu too, otherwise
  // "презентацию" (stemmed) wouldn't find a group written with raw "презентация"
  const tokens = new Set(tokenize(query));
  const extra = [];
  for (const group of BRIDGES) {
    if (group.some(w => tokens.has(stemRu(w)))) {
      for (const w of group) if (!tokens.has(stemRu(w))) extra.push(w);
    }
  }
  return extra.length ? query + ' ' + extra.join(' ') : query;
}

// Top-N skills for a query. Index: name (x2 — an exact name hit should outweigh a
// description hit) + description + rich description from SKILL.md. Query is expanded
// via the RU<->EN bridges. confidence: 'strong' | 'weak' (topScore < WEAK_TOP) — honest
// over confidently wrong; the tail below 35% of the leader's score is cut (usually
// accidental single-token overlap noise). WEAK_TOP is a rough calibration constant —
// tune it against your own manifest/usage if matches feel systematically off.
const WEAK_TOP = 6.0;
export function match(query, skills, opt) {
  const top = (opt && opt.top) || 3;
  const q = expandQuery(query);
  const docs = skills.map(s => ({ id: s.name, name: s.name, path: s.path, description: s.description, rich: s.rich }));
  const corpus = buildCorpus(docs, {
    textOf: d => {
      const nm = String(d.name).replace(/-/g, ' ');
      return nm + ' ' + nm + ' ' + String(d.description || '') + ' ' + String(d.rich || '');
    },
  });
  const all = docs
    .map(d => ({ skill: d, score: bm25Score(q, d.id, corpus) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
  const topScore = all.length ? all[0].score : 0;
  const results = all.filter(r => r.score >= topScore * 0.35).slice(0, top);
  return { results: results, confidence: topScore >= WEAK_TOP ? 'strong' : 'weak' };
}

// ─── Lifecycle: usage + feedback bookkeeping (the deterministic part of the
// match -> acquire -> create -> improve cycle; the judgment stages live in the
// skill-lifecycle SKILL.md) ───
export function logUsage(entry, logPath) {
  const p = logPath || process.env.SKILL_MATCH_USAGE || USAGE_LOG;
  ensureStateDir();
  try { appendFileSync(p, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n'); } catch { /* logging is non-critical */ }
}
export function readUsage(logPath) {
  const p = logPath || process.env.SKILL_MATCH_USAGE || USAGE_LOG;
  try {
    return readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}
// Feedback summary: skill -> {ok, fail, notes[]}; improve candidates = fail>=2 && fail>ok.
export function usageStats(entries) {
  const by = new Map();
  for (const e of entries) {
    if (e.type !== 'feedback' || !e.skill) continue;
    const s = by.get(e.skill) || { ok: 0, fail: 0, notes: [] };
    if (e.verdict === 'ok') s.ok++; else if (e.verdict === 'fail') { s.fail++; if (e.note) s.notes.push(e.note); }
    by.set(e.skill, s);
  }
  const improve = [...by.entries()].filter(([, s]) => s.fail >= 2 && s.fail > s.ok)
    .map(([name, s]) => ({ name, ...s }));
  return { by, improve };
}
// Catalog gaps: repeated weak/none queries from the usage log = data for the CREATE
// stage ("this class of task keeps coming back without a strong skill"). Clustering is
// by stemmed-token overlap (>=2 shared meaningful tokens = one cluster); a cluster
// becomes a candidate at >=2 queries.
export function catalogGaps(entries) {
  const misses = entries.filter(e => e.type === 'match' && (e.confidence === 'weak' || !(e.top || []).length));
  const clusters = [];
  for (const m of misses) {
    // >=2, not >=3: short domain tokens (qr, ai, ...) are often the core of a cluster
    const toks = new Set(tokenize(m.query).filter(t => t.length >= 2));
    let placed = false;
    for (const c of clusters) {
      let common = 0;
      for (const t of toks) if (c.tokens.has(t)) common++;
      if (common >= 2) { c.queries.push(m.query); for (const t of toks) c.tokens.add(t); placed = true; break; }
    }
    if (!placed) clusters.push({ tokens: toks, queries: [m.query] });
  }
  return clusters.filter(c => c.queries.length >= 2)
    .sort((a, b) => b.queries.length - a.queries.length)
    .map(c => ({ count: c.queries.length, queries: c.queries.slice(0, 5) }));
}

// ACQUIRE stage: no local skill found — a ready research plan for the agent (2026 skills world).
export function acquireHint(query) {
  return [
    'No local skill found (' + query + '). ACQUIRE stage — search the world (skill-lifecycle protocol):',
    '  1. gh search repos "' + query.split(/\s+/).slice(0, 3).join(' ') + ' skill claude" --sort stars --limit 10',
    '  2. Catalogs: agentskills.io · winning plugin marketplaces (ponytail/superpowers ecosystem) · awesome-claude-code',
    '  3. Found one -> install it (/plugin marketplace add <owner>/<repo>, or clone into your skills dir) -> re-run match',
    '  4. Nothing found -> CREATE stage: use superpowers:writing-skills + the official Anthropic skill-authoring checklist',
  ].join('\n');
}

function cli() {
  const args = process.argv.slice(2);
  // --feedback <skill> ok|fail [--note "..."] — outcome of using a skill (feeds the IMPROVE stage)
  const fbIdx = args.indexOf('--feedback');
  if (fbIdx >= 0) {
    const skill = args[fbIdx + 1], verdict = args[fbIdx + 2];
    const noteIdx = args.indexOf('--note');
    if (!skill || !['ok', 'fail'].includes(verdict)) { console.log('usage: --feedback <skill> ok|fail [--note "..."]'); return; }
    logUsage({ type: 'feedback', skill: skill, verdict: verdict, note: noteIdx >= 0 ? args[noteIdx + 1] : undefined });
    console.log('feedback recorded: ' + skill + ' -> ' + verdict);
    return;
  }
  // --gaps — catalog gaps: repeated weak/none classes = data for the CREATE stage
  if (args.includes('--gaps')) {
    const gaps = catalogGaps(readUsage());
    if (!gaps.length) { console.log('(no catalog gaps yet — no repeated weak/none class accumulated)'); return; }
    console.log('# Catalog gaps (repeated classes with no strong skill):');
    for (const g of gaps) console.log('  - x' + g.count + ': ' + g.queries.join(' | '));
    console.log('\nCREATE stage per skill-lifecycle: >=2 repeats = "yes" on the repeatability question.');
    return;
  }
  // --stats — improve candidates
  if (args.includes('--stats')) {
    const { by, improve } = usageStats(readUsage());
    console.log('# skill-match stats (' + by.size + ' skills with feedback)');
    for (const [name, s] of by) console.log('  ' + name + ': ok=' + s.ok + ' fail=' + s.fail);
    if (improve.length) {
      console.log('\n⚠️ IMPROVE CANDIDATES (fail>=2 and fail>ok):');
      for (const c of improve) console.log('  - ' + c.name + ' (fail=' + c.fail + '): ' + c.notes.slice(-2).join(' · '));
    } else console.log('\n(no improve candidates)');
    return;
  }
  const query = args.find(a => a.indexOf('--') !== 0);
  if (!query) {
    console.log('skill-match — skill router + lifecycle bookkeeping (match lives here; acquire/create/improve — see the skill-lifecycle skill).');
    console.log('usage: node skill-match.mjs "<task>" [--top N] [--manifest path] [--json]');
    console.log('       node skill-match.mjs --feedback <skill> ok|fail [--note "..."]');
    console.log('       node skill-match.mjs --stats');
    console.log('       node skill-match.mjs --gaps');
    console.log('env:   SKILLS_MANIFEST SKILLS_DIRS SKILL_MATCH_CACHE SKILL_MATCH_USAGE');
    return;
  }
  const topIdx = args.indexOf('--top');
  const top = topIdx >= 0 ? (parseInt(args[topIdx + 1], 10) || 3) : 3;
  const manifestIdx = args.indexOf('--manifest');
  const manifest = manifestIdx >= 0 ? args[manifestIdx + 1] : process.env.SKILLS_MANIFEST;
  const asJson = args.includes('--json');

  const skills = enrichSkills(loadSkills(manifest));
  const { results, confidence } = match(query, skills, { top: top });

  if (asJson) {
    console.log(JSON.stringify({
      query: query, total: skills.length, confidence: confidence,
      results: results.map(r => ({ name: r.skill.name, score: +r.score.toFixed(3), path: r.skill.path })),
    }));
    return;
  }
  logUsage({ type: 'match', query: query, top: results.map(r => r.skill.name), confidence: confidence });
  if (!results.length) {
    console.log(acquireHint(query));
    return;
  }
  const mark = confidence === 'weak' ? ' · ⚠️ weak match — double check by eye' : '';
  console.log('# "' + query + '" -> top-' + results.length + ' of ' + skills.length + mark);
  for (const r of results) {
    const s = r.skill;
    console.log('');
    console.log('- ' + s.name + '  (score ' + r.score.toFixed(3) + ')');
    console.log('  ' + s.path);
    console.log('  read: cat "' + s.path + '/SKILL.md"');
  }
  if (confidence === 'weak') {
    console.log('\nIf this isn\'t it — ' + acquireHint(query).split('\n').slice(0, 3).join('\n'));
  }
}

// realpath both sides: on macOS /tmp is a symlink to /private/tmp, otherwise isMain
// would false-negative when invoked via a tmp path.
const isMain = realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) cli();
