import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  totalPoints,
  submitEvidence,
  reviewSubmission,
  normalizeEvidence,
  saveMission,
  parseState,
  canSubmit,
} from '../src/lib/model.ts';

const now = '2026-10-01T21:00:00.000Z';
const description =
  'This is an original contribution with evidence and all requirements documented.';
function delivered() {
  return submitEvidence(
    initialState(),
    'share-vision',
    'https://example.com/first',
    description,
    's1',
    now,
  );
}

test('a new participant starts at zero; pending evidence grants no points', () => {
  assert.equal(totalPoints(initialState()), 0);
  const state = delivered();
  assert.equal(totalPoints(state), 0);
  assert.equal(state.submissions[0].status, 'pending');
  assert.equal(canSubmit(state, 'share-vision'), false);
});
test('a final verified contribution credits points exactly once', () => {
  const state = reviewSubmission(
    delivered(),
    's1',
    'verified',
    'The evidence meets all requirements.',
    now,
  );
  assert.equal(totalPoints(state), 120);
  assert.throws(
    () => reviewSubmission(state, 's1', 'verified', 'Repeated review attempt.', now),
    /final/,
  );
});
test('an intermediate review retains a complete audit trail and grants no points', () => {
  let state = reviewSubmission(
    delivered(),
    's1',
    'review',
    'We need to confirm the original post.',
    now,
  );
  assert.equal(totalPoints(state), 0);
  state = reviewSubmission(state, 's1', 'verified', 'Originality and requirements confirmed.', now);
  assert.equal(state.submissions[0].decisions.length, 2);
  assert.equal(totalPoints(state), 120);
});
test('editing mission points cannot alter an already submitted contribution', () => {
  let state = delivered();
  state = saveMission(state, { ...state.missions[0], points: 500 });
  state = reviewSubmission(state, 's1', 'verified', 'Meets the mission requirements.', now);
  assert.equal(totalPoints(state), 120);
  assert.equal(state.missions[0].points, 500);
});
test('equivalent evidence URLs cannot be reused across missions', () => {
  const state = submitEvidence(
    initialState(),
    'share-vision',
    'https://example.com/post/?utm_source=x#fragment',
    description,
    's1',
    now,
  );
  assert.equal(
    normalizeEvidence('https://example.com/post'),
    normalizeEvidence(state.submissions[0].url),
  );
  assert.throws(
    () =>
      submitEvidence(
        state,
        'first-meme',
        'https://example.com/post?utm_medium=social',
        description,
        's2',
        now,
      ),
    /already been submitted/,
  );
});
test('unsafe protocols, credentials and invalid URLs are rejected', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///c:/secret',
    'https://user:pass@example.com',
    'not-a-url',
  ])
    assert.equal(normalizeEvidence(url), null);
});
test('rejection permits a new delivery but requires distinct evidence', () => {
  const rejected = reviewSubmission(
    delivered(),
    's1',
    'rejected',
    'An explanation of the requirements is missing.',
    now,
  );
  assert.equal(canSubmit(rejected, 'share-vision'), true);
  assert.throws(
    () =>
      submitEvidence(rejected, 'share-vision', 'https://example.com/first', description, 's2', now),
    /already been submitted/,
  );
  const next = submitEvidence(
    rejected,
    'share-vision',
    'https://example.com/corrected',
    description,
    's2',
    now,
  );
  assert.equal(next.submissions.length, 2);
  assert.equal(totalPoints(next), 0);
});
test('closed missions block new submissions without deleting existing evidence', () => {
  const state = delivered();
  const archived = { ...state, missions: state.missions.map((m) => ({ ...m, archived: true })) };
  assert.equal(canSubmit(archived, 'first-meme'), false);
  assert.throws(
    () => submitEvidence(archived, 'first-meme', 'https://example.com/new', description, 's2', now),
    /closed/,
  );
  assert.equal(
    totalPoints(
      reviewSubmission(
        archived,
        's1',
        'verified',
        'The submission arrived before closing and meets requirements.',
        now,
      ),
    ),
    120,
  );
});
test('invalid mission rewards and missing requirements cannot be saved', () => {
  const state = initialState();
  for (const points of [0, -1, 1.5, 1001, NaN])
    assert.throws(() => saveMission(state, { ...state.missions[0], points }), /whole number/);
  assert.throws(
    () => saveMission(state, { ...state.missions[0], requirements: [] }),
    /requirements/,
  );
});
test('review and delivery require meaningful descriptions', () => {
  assert.throws(
    () =>
      submitEvidence(
        initialState(),
        'share-vision',
        'https://example.com/evidence',
        'short',
        's1',
        now,
      ),
    /20 to 2000/,
  );
  assert.throws(() => reviewSubmission(delivered(), 's1', 'verified', '', now), /reason/);
});
test('persisted submissions and decisions survive a JSON round trip', () => {
  const state = reviewSubmission(
    delivered(),
    's1',
    'verified',
    'The evidence meets all requirements.',
    now,
  );
  assert.deepEqual(parseState(JSON.stringify(state)), state);
});
test('invalid storage versions and corrupted submission URLs are rejected', () => {
  assert.throws(() => parseState(JSON.stringify({ ...initialState(), version: 99 })), /format/);
  const state = delivered();
  assert.throws(
    () =>
      parseState(
        JSON.stringify({
          ...state,
          submissions: [{ ...state.submissions[0], url: 'javascript:alert(1)' }],
        }),
      ),
    /submissions/,
  );
});

test('legacy example content migrates to English while progress and custom content stay intact', () => {
  const state = delivered();
  const legacy = JSON.parse(JSON.stringify(state));
  legacy.missions[0].title = 'Comparte la visión de la Order';
  legacy.missions[0].category = 'Contenido';
  legacy.missions[0].requirements[0] = 'Crea una publicación original de al menos 100 palabras.';
  legacy.submissions[0].missionTitle = legacy.missions[0].title;
  legacy.submissions[0].reason =
    'Evidencia recibida. Pendiente de revisión Keepers en esta prueba local.';
  legacy.missions.push({
    ...legacy.missions[0],
    id: 'custom-mission',
    title: 'Mi misión personalizada',
  });
  const migrated = parseState(JSON.stringify(legacy));
  assert.equal(migrated.missions[0].title, 'Share the vision of the Order');
  assert.equal(migrated.missions[0].category, 'Content');
  assert.equal(
    migrated.missions[0].requirements[0],
    'Create an original post of at least 100 words.',
  );
  assert.equal(migrated.submissions[0].missionTitle, migrated.missions[0].title);
  assert.match(migrated.submissions[0].reason, /Awaiting a Keepers review/);
  assert.equal(migrated.submissions[0].description, state.submissions[0].description);
  assert.equal(migrated.submissions[0].points, 120);
  assert.equal(migrated.missions.at(-1)!.title, 'Mi misión personalizada');
  assert.equal(migrated.missions.at(-1)!.category, 'Content');
  assert.deepEqual(parseState(JSON.stringify(migrated)), migrated);
});
