import { Injectable } from '@nestjs/common';
import { ExtractedEntityType } from '@prisma/client';

export const ENTITY_NORMALIZER_NAME = 'builtin-surface-entity-normalizer';
export const ENTITY_NORMALIZER_VERSION = '1.0.0';

export interface NormalizedEntityName {
  canonicalName: string;
  normalizedName: string;
  method: 'surface-normalization' | 'time-clock-normalization' | 'honorific-normalization';
}

@Injectable()
export class BuiltinEntityNormalizer {
  readonly name = ENTITY_NORMALIZER_NAME;
  readonly version = ENTITY_NORMALIZER_VERSION;

  normalize(type: ExtractedEntityType, name: string): NormalizedEntityName {
    const base = normalizeSurface(name);
    if (type === ExtractedEntityType.TIME) {
      const clock = normalizeClock(name);
      if (clock) {
        return { canonicalName: clock, normalizedName: clock, method: 'time-clock-normalization' };
      }
    }
    if (type === ExtractedEntityType.CHARACTER) {
      const honorific = base.replace(/(?:先生|女士|老师)$/u, '').replace(/阿姨$/u, '姨');
      if (honorific && honorific !== base) {
        return {
          canonicalName: honorific,
          normalizedName: honorific,
          method: 'honorific-normalization',
        };
      }
    }
    return {
      canonicalName: base || name.trim(),
      normalizedName: base || name.trim(),
      method: 'surface-normalization',
    };
  }
}

function normalizeSurface(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function normalizeClock(value: string): string | undefined {
  const normalized = value.normalize('NFKC').trim();
  const digital = normalized.match(/(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)(?:$|\D)/u);
  if (digital) return `${digital[1].padStart(2, '0')}:${digital[2]}`;
  const chinese = normalized.match(
    /^(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)?([零〇一二两三四五六七八九十百\d]+)点(?:([零〇一二两三四五六七八九十百\d]+)分?)?$/u,
  );
  if (!chinese) return undefined;
  let hour = parseChineseNumber(chinese[2]);
  const minute = chinese[3] ? parseChineseNumber(chinese[3]) : 0;
  if (hour === undefined || minute === undefined || minute > 59) return undefined;
  if ((chinese[1] === '下午' || chinese[1] === '晚上' || chinese[1] === '傍晚') && hour < 12)
    hour += 12;
  if (hour > 23) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseChineseNumber(value: string): number | undefined {
  if (/^\d+$/u.test(value)) return Number(value);
  const digits: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  let total = 0;
  let current = 0;
  for (const char of value) {
    if (char in digits) current = digits[char];
    else if (char === '十') {
      total += (current || 1) * 10;
      current = 0;
    } else if (char === '百') {
      total += (current || 1) * 100;
      current = 0;
    } else return undefined;
  }
  return total + current;
}
