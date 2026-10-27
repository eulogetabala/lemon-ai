import test from 'node:test';
import assert from 'node:assert/strict';

import { stripRichTextFormatting, getPlainTextLength, sanitizeRichTextContent } from '../lib/rich-text.ts';

test('stripRichTextFormatting removes HTML tags while preserving readable text', () => {
  const content = '<p><strong>Bonjour</strong> <em>tout le monde</em> <a href="https://example.com">ici</a></p>';

  assert.equal(stripRichTextFormatting(content), 'Bonjour tout le monde ici');
  assert.equal(getPlainTextLength('<b>Bold</b> and <i>italic</i>'), 15);
});

test('sanitizeRichTextContent removes unsafe elements', () => {
  const content = '<p>Bonjour</p><script>alert("x")</script><p>Merci</p>';

  assert.equal(sanitizeRichTextContent(content), '<p>Bonjour</p><p>Merci</p>');
});
