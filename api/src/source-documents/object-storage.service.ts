import {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';

export interface StoredObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
  sha256: string;
}

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    const configuredEndpoint = process.env.OBJECT_STORAGE_ENDPOINT;
    const useLocalMinioDefaults = configuredEndpoint === undefined;
    const endpoint = useLocalMinioDefaults
      ? 'http://localhost:9000'
      : configuredEndpoint.trim() || undefined;
    const accessKeyId =
      process.env.OBJECT_STORAGE_ACCESS_KEY?.trim() ||
      (useLocalMinioDefaults ? 'minioadmin' : undefined);
    const secretAccessKey =
      process.env.OBJECT_STORAGE_SECRET_KEY?.trim() ||
      (useLocalMinioDefaults ? 'change-me-too' : undefined);

    this.bucket = process.env.OBJECT_STORAGE_BUCKET?.trim() || 'comicdrama';
    this.client = new S3Client({
      endpoint,
      region: process.env.OBJECT_STORAGE_REGION?.trim() || 'us-east-1',
      forcePathStyle: this.readBoolean('OBJECT_STORAGE_FORCE_PATH_STYLE', Boolean(endpoint)),
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
  }

  async putObject(input: StoredObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        Metadata: { sha256: input.sha256 },
      }),
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(`对象存储返回空对象: ${key}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      this.logger.error(`清理对象存储临时文件失败: ${key}`, error);
    }
  }

  private readBoolean(name: string, fallback: boolean): boolean {
    const value = process.env[name]?.trim().toLowerCase();
    if (value === undefined || value === '') {
      return fallback;
    }
    return value === 'true' || value === '1' || value === 'yes';
  }
}
