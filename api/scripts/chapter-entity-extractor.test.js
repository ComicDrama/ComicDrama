/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  BuiltinChapterEntityExtractor,
} = require('../dist/source-documents/builtin-chapter-entity-extractor.service.js');

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
console.log(`chapter entity extractor smoke test passed (${entities.length} candidates)`);
