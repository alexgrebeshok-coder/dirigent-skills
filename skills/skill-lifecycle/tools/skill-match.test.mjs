// skill-match.test.mjs — node --test. Runs entirely against a fixture manifest (no
// dependency on any real ~/.claude/skills install), so it works standalone after a
// fresh clone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { match, loadSkills, enrichSkills, expandQuery, usageStats, acquireHint, catalogGaps } from './skill-match.mjs';

const FIXTURE_MANIFEST = {
  skills: [
    { name: 'docx-ru', path: '/fixtures/docx-ru', description: 'Create Russian business documents (docx/pdf) — letters, reports, contracts.' },
    { name: 'looper', path: '/fixtures/looper', description: 'Design a loop harness before launching any autonomous loop or background agent.' },
    { name: 'verify-done', path: '/fixtures/verify-done', description: 'Run the real check before claiming a task is finished — tests, build, the command.' },
    { name: 'xlsx', path: '/fixtures/xlsx', description: 'Create and edit Excel spreadsheets, formulas, and pivot tables.' },
  ],
};

const tmpDir = mkdtempSync(join(tmpdir(), 'skill-match-test-'));
const manifestPath = join(tmpDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(FIXTURE_MANIFEST));
const cachePath = join(tmpDir, 'cache.json');

// enrichSkills tries to read <path>/SKILL.md for a richer description; fixture paths
// don't exist on disk, so it silently falls back to the manifest description — exactly
// the documented behavior for a manifest without a matching skill directory.
const skills = enrichSkills(loadSkills(manifestPath), cachePath);

const cases = [
  ['make a russian business letter in docx',        'docx-ru'],
  ['design a loop harness before I launch /loop',   'looper'],
  ['run the tests before saying done',              'verify-done'],
  ['build an excel spreadsheet with formulas',       'xlsx'],
];

for (const [query, expected] of cases) {
  test('match: ' + JSON.stringify(query) + ' -> ' + expected + ' in top-3', () => {
    const got = match(query, skills, { top: 3 }).results.map(r => r.skill.name);
    assert.ok(got.includes(expected), 'expected ' + expected + ' in top-3, got: ' + got.join(', '));
  });
}

test('RU<->EN bridge: "сделай таблицу excel" finds the xlsx skill', () => {
  const got = match('сделай таблицу excel с формулами', skills, { top: 3 }).results.map(r => r.skill.name);
  assert.ok(got.some(n => /xlsx|excel/i.test(n)), 'expected the xlsx skill via bridge, got: ' + got.join(', '));
});

test('expandQuery adds bridge tokens and leaves unrelated text alone', () => {
  const ex = expandQuery('сделай таблицу');
  assert.ok(ex.includes('xlsx') && ex.includes('excel'), 'excel-group bridge: ' + ex);
  assert.equal(expandQuery('completely unrelated'), 'completely unrelated');
});

test('garbage query -> no matches (score 0)', () => {
  assert.equal(match('zzzqqq', skills, { top: 3 }).results.length, 0);
});

// WEAK_TOP is calibrated against a realistic catalog (dozens of skills); a 4-skill
// fixture naturally scores lower — so this only checks confidence is a valid label and
// the right skill still wins, not the specific 'strong' threshold.
test('confidence: valid label, and the right skill still ranks first', () => {
  const r = match('make a russian business letter in docx', skills, { top: 3 });
  assert.ok(['strong', 'weak'].includes(r.confidence));
  assert.equal(r.results[0].skill.name, 'docx-ru');
});

test('usageStats: fail>=2 && fail>ok -> improve candidate', () => {
  const entries = [
    { type: 'feedback', skill: 'a', verdict: 'fail', note: 'n1' },
    { type: 'feedback', skill: 'a', verdict: 'fail', note: 'n2' },
    { type: 'feedback', skill: 'a', verdict: 'ok' },
    { type: 'feedback', skill: 'b', verdict: 'ok' },
    { type: 'feedback', skill: 'c', verdict: 'fail' },
    { type: 'match', query: 'x' },
  ];
  const { improve, by } = usageStats(entries);
  assert.deepEqual(improve.map(i => i.name), ['a']);
  assert.equal(by.get('b').ok, 1);
  assert.equal(by.get('c').fail, 1); // a single fail is not yet a candidate
});

test('acquireHint mentions the ACQUIRE and CREATE stages', () => {
  const h = acquireHint('rare task');
  assert.ok(h.includes('ACQUIRE') && h.includes('CREATE') && h.includes('gh search'));
});

test('catalogGaps clusters repeated weak/none queries and drops singletons', () => {
  const entries = [
    { type: 'match', query: 'generate a qr code for a link', confidence: 'weak', top: [] },
    { type: 'match', query: 'qr code for a business card', confidence: 'weak', top: ['x'] },
    { type: 'match', query: 'something else entirely on its own', confidence: 'weak', top: [] },
    { type: 'match', query: 'make a docx', confidence: 'strong', top: ['docx-ru'] },
  ];
  const gaps = catalogGaps(entries);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].count, 2);
});
