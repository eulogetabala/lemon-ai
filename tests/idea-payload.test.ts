import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeIdeaPayload, validateIdeaPayload } from '../lib/idea-payload.ts';

test('normalizeIdeaPayload prefers a valid groupId and trims values', () => {
  const payload = normalizeIdeaPayload({
    title: '  My idea  ',
    groupId: '',
    columnId: 'col-123',
    description: 'hello',
    sortOrder: 2,
    images: [{ url: 'https://example.com/a.png' }],
  });

  assert.equal(payload.title, 'My idea');
  assert.equal(payload.groupId, 'col-123');
  assert.equal(payload.description, 'hello');
  assert.equal(payload.sortOrder, 2);
  assert.equal(payload.images.length, 1);
});

test('normalizeIdeaPayload accepts a columnId-only payload', () => {
  const payload = normalizeIdeaPayload({
    title: 'Idea from column',
    columnId: '  col-456  ',
  });

  assert.equal(payload.groupId, 'col-456');
  assert.equal(payload.title, 'Idea from column');
});

test('validateIdeaPayload rejects missing title or group id', () => {
  const result = validateIdeaPayload({ title: '   ', groupId: '' });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ['Missing required fields']);
});
