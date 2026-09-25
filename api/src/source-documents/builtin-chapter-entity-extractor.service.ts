import { Injectable } from '@nestjs/common';
import { ExtractedEntityType } from '@prisma/client';
import {
  CHAPTER_ENTITY_EXTRACTOR_NAME,
  CHAPTER_ENTITY_EXTRACTOR_VERSION,
  type ChapterEntityExtractor,
  type ChapterEntitySourceSegment,
  type ExtractedEntityCandidate,
  type ExtractedEntityMentionCandidate,
} from './chapter-entity-extractor.interface';

const DICTIONARY: ReadonlyArray<{
  type: ExtractedEntityType;
  terms: readonly string[];
  confidence: number;
}> = [
  {
    type: ExtractedEntityType.CHARACTER,
    terms: ['林砚', '小满', '许姨', '白裙女人'],
    confidence: 0.96,
  },
  {
    type: ExtractedEntityType.LOCATION,
    terms: ['青禾巷十七号', '旧电影院', '青禾巷', '便利店', '热饮摊', '放映室', '巷口', '大厅'],
    confidence: 0.9,
  },
  {
    type: ExtractedEntityType.PROP,
    terms: [
      '红色纸灯笼',
      '旧电子表',
      '黄色雨衣',
      '透明雨伞',
      '热牛奶',
      '保温箱',
      '电动车',
      '铜铃',
      '手机',
      '头盔',
      '灯芯',
      '手套',
    ],
    confidence: 0.86,
  },
  {
    type: ExtractedEntityType.ORGANIZATION,
    terms: ['外卖平台', '平台', '商家'],
    confidence: 0.72,
  },
];

const TIME_PATTERN =
  /(?:凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)?[零〇一二三四五六七八九十百千万\d]+点(?:[零〇一二三四五六七八九十百千万\d]+分)?|\b(?:[01]?\d|2[0-3]):[0-5]\d\b|(?:[零〇一二三四五六七八九十百千万\d]+年前)|(?:[零〇一二三四五六七八九十百千万\d]+分钟)|天快亮时/g;
const EVENT_TRIGGER =
  /接到|接单|送到|警告|别去了|出现|走进|发现|要求|交出|点亮|归还|消失|完成|叫住|看见/u;

@Injectable()
export class BuiltinChapterEntityExtractor implements ChapterEntityExtractor {
  readonly name = CHAPTER_ENTITY_EXTRACTOR_NAME;
  readonly version = CHAPTER_ENTITY_EXTRACTOR_VERSION;

  extract(segments: ChapterEntitySourceSegment[]): ExtractedEntityCandidate[] {
    const candidates = new Map<string, ExtractedEntityCandidate>();
    const add = (
      type: ExtractedEntityType,
      name: string,
      segment: ChapterEntitySourceSegment,
      localStart: number,
      localEnd: number,
      confidence: number,
      evidence: string,
    ): void => {
      const key = `${type}:${name}`;
      const mention: ExtractedEntityMentionCandidate = {
        sourceSegmentId: segment.id,
        text: segment.content.slice(localStart, localEnd),
        startOffset: segment.startOffset + localStart,
        endOffset: segment.startOffset + localEnd,
        startLine: lineAt(segment, localStart),
        endLine: lineAt(segment, Math.max(localStart, localEnd - 1)),
        evidence,
        confidence,
      };
      const current = candidates.get(key);
      if (current) {
        if (
          !current.mentions.some(
            (item) =>
              item.sourceSegmentId === mention.sourceSegmentId &&
              item.startOffset === mention.startOffset &&
              item.endOffset === mention.endOffset,
          )
        ) {
          current.mentions.push(mention);
        }
        return;
      }
      candidates.set(key, {
        type,
        name,
        normalizedName: name,
        confidence,
        attributes: { method: 'deterministic-rule', occurrenceCount: 1 },
        mentions: [mention],
      });
    };

    for (const segment of segments) {
      for (const entry of DICTIONARY) {
        for (const term of entry.terms) {
          for (const localStart of findAll(segment.content, term)) {
            add(
              entry.type,
              term,
              segment,
              localStart,
              localStart + term.length,
              entry.confidence,
              `词典命中：${term}`,
            );
          }
        }
      }
      for (const match of segment.content.matchAll(TIME_PATTERN)) {
        if (match.index === undefined) continue;
        add(
          ExtractedEntityType.TIME,
          match[0],
          segment,
          match.index,
          match.index + match[0].length,
          0.9,
          `时间模式命中：${match[0]}`,
        );
      }
      for (const sentence of sentences(segment.content)) {
        if (!EVENT_TRIGGER.test(sentence.text)) continue;
        const name = sentence.text.trim();
        if (name.length < 4 || name.length > 160) continue;
        const leadingWhitespace = sentence.text.length - sentence.text.trimStart().length;
        const start = sentence.start + leadingWhitespace;
        add(
          ExtractedEntityType.EVENT,
          name,
          segment,
          start,
          start + name.length,
          0.55,
          '包含关键动作词的句子候选；尚未进行跨章节关系或因果归并',
        );
      }
    }

    return [...candidates.values()]
      .map((candidate) => ({
        ...candidate,
        attributes: {
          ...candidate.attributes,
          occurrenceCount: candidate.mentions.length,
        },
      }))
      .sort(
        (left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name),
      );
  }
}

function findAll(text: string, term: string): number[] {
  const starts: number[] = [];
  let offset = text.indexOf(term);
  while (offset !== -1) {
    starts.push(offset);
    offset = text.indexOf(term, offset + term.length);
  }
  return starts;
}

function lineAt(segment: ChapterEntitySourceSegment, localOffset: number): number | null {
  if (segment.startLine === null) return null;
  return segment.startLine + (segment.content.slice(0, localOffset).match(/\n/g)?.length ?? 0);
}

function sentences(text: string): Array<{ text: string; start: number }> {
  const result: Array<{ text: string; start: number }> = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if ('。！？!?'.includes(text[index] ?? '')) {
      result.push({ text: text.slice(start, index + 1), start });
      start = index + 1;
    }
  }
  if (start < text.length) result.push({ text: text.slice(start), start });
  return result;
}
