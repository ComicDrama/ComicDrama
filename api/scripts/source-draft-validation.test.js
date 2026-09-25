/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { SourceDraftKind } = require('@prisma/client');
const { validateSourceDraft } = require('../dist/source-documents/source-draft.schema');

const validCharacter = {
  aliases: ['小林'],
  role: null,
  personality: null,
  background: null,
  appearance: null,
  costume: null,
  openQuestions: ['待人工确认'],
};
assert.deepEqual(validateSourceDraft(SourceDraftKind.CHARACTER, '林砚', validCharacter), []);

const invalid = validateSourceDraft(SourceDraftKind.CHARACTER, '', {
  aliases: '小林',
  role: null,
  unexpected: true,
});
assert.ok(invalid.some((issue) => issue.path === '/name'));
assert.ok(invalid.some((issue) => issue.path === '/content/aliases' && issue.keyword === 'type'));
assert.ok(
  invalid.some((issue) => issue.path === '/content/personality' && issue.keyword === 'required'),
);
assert.ok(invalid.some((issue) => issue.path === '/content/unexpected'));
console.log('Source draft validation tests passed');
