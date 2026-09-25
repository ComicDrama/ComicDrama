/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  BuiltinChapterEntityExtractor,
} = require('../dist/source-documents/builtin-chapter-entity-extractor.service.js');
const {
  BuiltinEntityNormalizer,
} = require('../dist/source-documents/builtin-entity-normalizer.service.js');
const {
  NarrativeStructureBuilder,
} = require('../dist/source-documents/narrative-structure.service.js');

const sample = fs.readFileSync(path.resolve(__dirname, '../../V1测试样本_雨夜的灯.md'), 'utf8');
const firstChapterStart = sample.indexOf('## 第一章：最后一单');
const secondChapterStart = sample.indexOf('## 第二章：');
const chapter = sample.slice(
  firstChapterStart,
  secondChapterStart === -1 ? undefined : secondChapterStart,
);
const offset = sample.indexOf(chapter);
const extractor = new BuiltinChapterEntityExtractor();
const entities = extractor.extract([
  {
    id: '00000000-0000-0000-0000-000000000001',
    content: chapter,
    startOffset: offset,
    startLine: 1,
  },
]);

function has(type, name) {
  return entities.some((entity) => entity.type === type && entity.name === name);
}

assert.ok(has('CHARACTER', '林砚'));
assert.ok(has('CHARACTER', '小满'));
assert.ok(has('CHARACTER', '许姨'));
assert.ok(has('LOCATION', '青禾巷'));
assert.ok(has('LOCATION', '旧电影院'));
assert.ok(has('PROP', '铜铃'));
assert.ok(has('PROP', '红色纸灯笼'));
assert.ok(has('TIME', '23:47'));
assert.ok(entities.some((entity) => entity.type === 'EVENT'));
const lintYan = entities.find((entity) => entity.type === 'CHARACTER' && entity.name === '林砚');
assert.ok(
  lintYan.mentions.every(
    (mention) => sample.slice(mention.startOffset, mention.endOffset) === mention.text,
  ),
);

const normalizer = new BuiltinEntityNormalizer();
assert.equal(normalizer.normalize('TIME', '晚上十一点四十七分').normalizedName, '23:47');
assert.equal(normalizer.normalize('TIME', '23:47').normalizedName, '23:47');
assert.equal(
  normalizer.normalize('CHARACTER', '许阿姨').normalizedName,
  normalizer.normalize('CHARACTER', '许姨').normalizedName,
);
const narrativeBuilder = new NarrativeStructureBuilder();
const narrative = narrativeBuilder.build([
  {
    id: 'character-lin',
    type: 'CHARACTER',
    canonicalName: '林砚',
    confidence: 0.9,
    members: [
      {
        id: 'member-lin',
        chapterSegmentId: 'chapter-1',
        chapterOrdinal: 1,
        sourceOrdinal: 1,
        confidence: 0.9,
      },
    ],
  },
  {
    id: 'character-xiaoman',
    type: 'CHARACTER',
    canonicalName: '小满',
    confidence: 0.9,
    members: [
      {
        id: 'member-xiaoman',
        chapterSegmentId: 'chapter-1',
        chapterOrdinal: 1,
        sourceOrdinal: 2,
        confidence: 0.9,
      },
    ],
  },
  {
    id: 'time-2347',
    type: 'TIME',
    canonicalName: '23:47',
    confidence: 0.9,
    members: [
      {
        id: 'member-time',
        chapterSegmentId: 'chapter-1',
        chapterOrdinal: 1,
        sourceOrdinal: 3,
        confidence: 0.9,
      },
    ],
  },
  {
    id: 'event-last-order',
    type: 'EVENT',
    canonicalName: '最后一单',
    confidence: 0.8,
    members: [
      {
        id: 'member-event',
        chapterSegmentId: 'chapter-1',
        chapterOrdinal: 1,
        sourceOrdinal: 4,
        confidence: 0.8,
      },
    ],
  },
]);
assert.equal(narrative.relationships.length, 1);
assert.equal(narrative.relationships[0].occurrenceCount, 1);
assert.deepEqual(narrative.relationships[0].chapterSegmentIds, ['chapter-1']);
assert.equal(narrative.events.length, 1);
assert.equal(narrative.events[0].timelineOrder, 1);
assert.deepEqual(narrative.events[0].temporalAnchorIds, ['time-2347']);
assert.deepEqual([...narrative.events[0].participantIds].sort(), [
  'character-lin',
  'character-xiaoman',
]);

console.log(
  `chapter entity, normalization, and narrative structure smoke test passed (${entities.length} candidates)`,
);
