import { BadRequestException, Injectable } from '@nestjs/common';
import { SourceDocumentType } from '@prisma/client';
import { SourceDocumentParserService } from './source-document-parser.service';
import {
  type SourceDocumentParser,
  type SourceDocumentParserRegistration,
} from './source-document-parser.interface';

const PLANNED_PARSERS: readonly SourceDocumentParserRegistration[] = [
  {
    name: 'docx-parser',
    version: '0.1.0',
    documentTypes: [SourceDocumentType.DOCX],
    status: 'PLANNED',
    task: 'P3-06-DOCX：提取 DOCX 段落、标题、列表和文档属性，并映射到统一来源树。',
  },
  {
    name: 'epub-parser',
    version: '0.1.0',
    documentTypes: [SourceDocumentType.EPUB],
    status: 'PLANNED',
    task: 'P3-06-EPUB：读取 EPUB spine 和 XHTML 内容，保留章节顺序与来源定位。',
  },
  {
    name: 'pdf-parser',
    version: '0.1.0',
    documentTypes: [SourceDocumentType.PDF],
    status: 'PLANNED',
    task: 'P3-06-PDF：提取页面文本、页码和段落位置，并处理扫描 PDF 的 OCR 扩展点。',
  },
  {
    name: 'fountain-parser',
    version: '0.1.0',
    documentTypes: [SourceDocumentType.FOUNTAIN],
    status: 'PLANNED',
    task: 'P3-06-FOUNTAIN：识别场景标题、动作、角色、对白和转场。',
  },
  {
    name: 'final-draft-xml-parser',
    version: '0.1.0',
    documentTypes: [SourceDocumentType.FINAL_DRAFT_XML],
    status: 'PLANNED',
    task: 'P3-06-FDX：读取 Final Draft XML 的段落类型、样式和脚本元素层级。',
  },
  {
    name: 'unknown-parser',
    version: '0.1.0',
    documentTypes: [SourceDocumentType.UNKNOWN],
    status: 'PLANNED',
    task: 'P3-06-UNKNOWN：补充未知格式识别和人工选择 Parser 的入口。',
  },
];

@Injectable()
export class SourceDocumentParserRegistryService {
  constructor(private readonly textParser: SourceDocumentParserService) {}

  list(): SourceDocumentParserRegistration[] {
    return [this.implementedTextParser(), ...PLANNED_PARSERS].map((registration) => ({
      ...registration,
      documentTypes: [...registration.documentTypes],
    }));
  }

  getParser(documentType: SourceDocumentType): SourceDocumentParser {
    const registration = this.list().find((item) => item.documentTypes.includes(documentType));
    if (registration?.parser) {
      return registration.parser;
    }

    const task = registration?.task ?? '请先登记该格式的 Parser 实现任务。';
    throw new BadRequestException(
      `当前暂不支持解析 ${documentType}；Parser 已登记为待实现任务：${task}`,
    );
  }

  private implementedTextParser(): SourceDocumentParserRegistration {
    return {
      name: this.textParser.name,
      version: this.textParser.version,
      documentTypes: this.textParser.supportedDocumentTypes,
      status: 'IMPLEMENTED',
      task: 'P3-04：解析 TXT 和 Markdown 的文档、章节、段落及来源定位。',
      parser: this.textParser,
    };
  }
}
