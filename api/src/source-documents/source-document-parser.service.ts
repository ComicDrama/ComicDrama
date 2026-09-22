import { Injectable } from '@nestjs/common';
import { SourceSegmentType } from '@prisma/client';

export interface ParsedSourceSegment {
  type: SourceSegmentType;
  title?: string;
  content: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  parentIndex?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ParsedSourceText {
  textContent: string;
  segments: ParsedSourceSegment[];
}

interface SourceLine {
  number: number;
  startOffset: number;
  endOffset: number;
  content: string;
}

interface HeadingLine {
  level: number;
  title: string;
}

const PARSER_NAME = 'builtin-text-markdown';
const PARSER_VERSION = '1.0.0';

@Injectable()
export class SourceDocumentParserService {
  static readonly parserName = PARSER_NAME;
  static readonly parserVersion = PARSER_VERSION;

  parse(text: string): ParsedSourceText {
    const textContent = normalizeLineEndings(text);
    const lines = splitLines(textContent);
    const segments: ParsedSourceSegment[] = [
      {
        type: SourceSegmentType.DOCUMENT,
        content: textContent,
        startOffset: 0,
        endOffset: textContent.length,
        startLine: 1,
        endLine: lineForOffset(textContent, textContent.length),
        metadata: {
          offsetUnit: 'utf16-code-unit',
          offsetRange: 'half-open',
          lineBase: 1,
        },
      },
    ];
    const headingStack: Array<{ level: number; index: number }> = [];
    let paragraphStart: number | undefined;
    let fencedBlock = false;

    const flushParagraph = (endLineIndex: number): void => {
      if (paragraphStart === undefined) {
        return;
      }
      const firstLine = lines[paragraphStart];
      const lastLine = lines[endLineIndex - 1];
      if (!firstLine || !lastLine) {
        paragraphStart = undefined;
        return;
      }

      const rawStart = firstLine.startOffset;
      const rawEnd = lastLine.endOffset;
      const startOffset = trimStartOffset(textContent, rawStart, rawEnd);
      const endOffset = trimEndOffset(textContent, startOffset, rawEnd);
      if (startOffset < endOffset) {
        segments.push({
          type: SourceSegmentType.PARAGRAPH,
          content: textContent.slice(startOffset, endOffset),
          startOffset,
          endOffset,
          startLine: firstLine.number,
          endLine: lastLine.number,
          parentIndex: headingStack.at(-1)?.index ?? 0,
        });
      }
      paragraphStart = undefined;
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      const trimmedLine = line.content.trim();
      const fence = isFenceLine(line.content);
      const heading = fencedBlock ? undefined : parseHeading(line.content);

      if (fence) {
        if (paragraphStart === undefined) {
          paragraphStart = lineIndex;
        }
        fencedBlock = !fencedBlock;
        continue;
      }

      if (heading) {
        flushParagraph(lineIndex);
        while (headingStack.at(-1) && headingStack.at(-1)!.level >= heading.level) {
          headingStack.pop();
        }
        const parentIndex = headingStack.at(-1)?.index ?? 0;
        const index = segments.length;
        segments.push({
          type: isChapterTitle(heading.title)
            ? SourceSegmentType.CHAPTER
            : SourceSegmentType.SECTION,
          title: heading.title,
          content: heading.title,
          startOffset: line.startOffset,
          endOffset: line.endOffset,
          startLine: line.number,
          endLine: line.number,
          parentIndex,
          metadata: { headingLevel: heading.level },
        });
        headingStack.push({ level: heading.level, index });
        continue;
      }

      if (trimmedLine === '') {
        flushParagraph(lineIndex);
        continue;
      }

      if (paragraphStart === undefined) {
        paragraphStart = lineIndex;
      }
    }

    flushParagraph(lines.length);
    return { textContent, segments };
  }
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function splitLines(text: string): SourceLine[] {
  const rawLines = text.split('\n');
  let startOffset = 0;
  return rawLines.map((content, index) => {
    const line: SourceLine = {
      number: index + 1,
      startOffset,
      endOffset: startOffset + content.length,
      content,
    };
    startOffset = line.endOffset + 1;
    return line;
  });
}

function parseHeading(line: string): HeadingLine | undefined {
  const match = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.+?)\s*|)$/);
  if (!match?.[2]) {
    return undefined;
  }
  const title = match[2].replace(/[ \t]+#+[ \t]*$/, '').trim();
  return title ? { level: match[1].length, title } : undefined;
}

function isFenceLine(line: string): boolean {
  return /^ {0,3}(?:`{3,}|~{3,})/.test(line);
}

function isChapterTitle(title: string): boolean {
  return /(?:^|[\s:：])第[一二三四五六七八九十百千万\d]+章(?:$|[\s:：])|^(?:chapter|episode)\b|第[一二三四五六七八九十百千万\d]+集(?:$|[\s:：])/i.test(
    title,
  );
}

function trimStartOffset(text: string, startOffset: number, endOffset: number): number {
  let offset = startOffset;
  while (offset < endOffset && /\s/u.test(text[offset] ?? '')) {
    offset += 1;
  }
  return offset;
}

function trimEndOffset(text: string, startOffset: number, endOffset: number): number {
  let offset = endOffset;
  while (offset > startOffset && /\s/u.test(text[offset - 1] ?? '')) {
    offset -= 1;
  }
  return offset;
}

function lineForOffset(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length;
}
