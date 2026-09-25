/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { buildDrafts } = require('../dist/source-documents/source-draft-generation.service');

const mention = (text, id) => ({
  id,
  sourceSegmentId: 'segment-1',
  text,
  evidence: null,
  startOffset: 10,
  endOffset: 10 + text.length,
  startLine: 2,
  endLine: 2,
  confidence: 0.9,
  sourceSegment: { id: 'segment-1' },
});
const member = (id, name, text) => ({
  id: 'member-' + id,
  extractedEntity: { mentions: [mention(text, 'mention-' + id)] },
});
const entity = (id, type, name, text, aliases = []) => ({
  id,
  type,
  canonicalName: name,
  confidence: 0.8,
  aliases: aliases.map((alias) => ({ name: alias })),
  members: [member(id, name, text)],
});
const result = buildDrafts([
  entity('c1', 'CHARACTER', '林砚', '林砚', ['小林']),
  entity('l1', 'LOCATION', '青禾巷', '青禾巷'),
  entity('p1', 'PROP', '铜铃', '铜铃'),
  entity('o1', 'ORGANIZATION', '旧戏班', '旧戏班'),
  entity('t1', 'TIME', '23:47', '23:47'),
  entity('e1', 'EVENT', '雨夜相逢', '雨夜相逢'),
]);
assert.deepEqual(
  result.map((draft) => draft.kind),
  ['WORLD', 'CHARACTER', 'LOCATION', 'PROP'],
);
assert.equal(result[1].name, '林砚');
assert.deepEqual(result[1].content.aliases, ['小林']);
assert.equal(result[1].content.personality, null);
assert.equal(result[1].citations[0].quote, '林砚');
assert.equal(result[1].citations[0].startOffset, 10);
assert.deepEqual(result[0].content.organizations, ['旧戏班']);
assert.deepEqual(result[0].content.timeCandidates, ['23:47']);
assert.deepEqual(result[0].content.eventCandidates, ['雨夜相逢']);
assert.equal(result[0].citations.length, 6);
console.log('Source draft generation tests passed');
