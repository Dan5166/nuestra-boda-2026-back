import { BadRequestException, Injectable } from '@nestjs/common';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '../dynamodb/dynamodb.client';
import { S3Service } from '../s3/s3.service';
import { v4 as uuid } from 'uuid';

const TABLE_NAME = 'WeddingFiles';
const EVENT_ID = 'EVENT#2026';

@Injectable()
export class FilesService {
  constructor(private readonly s3Service: S3Service) {}

  /**
   * 1️⃣ Genera URL firmada para subir archivo a S3
   */
  async createUploadUrl(dto: { filename: string; contentType: string }) {
    console.log('OLA');
    const fileId = uuid();

    const key = `uploads/${fileId}-${dto.filename}`;
    console.log(`FILE SERVICE KEY: ${key}`);

    const uploadUrl = await this.s3Service.generateUploadUrl(
      key,
      dto.contentType,
    );

    return {
      fileId,
      key,
      uploadUrl,
    };
  }

  /**
   * 2️⃣ Confirma que el archivo fue subido y guarda metadata en DynamoDB
   */
  async confirmUpload(dto: {
    fileId: string;
    key: string;
    contentType: string;
    size: number;
  }) {
    if (!dto.key.includes(dto.fileId)) {
      throw new BadRequestException('Invalid file key');
    }
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: EVENT_ID,
          SK: `FILE#${dto.fileId}`,
          fileId: dto.fileId,
          s3Key: dto.key,
          contentType: dto.contentType,
          size: dto.size,
          uploadedAt: new Date().toISOString(),
          status: 'COMPLETED',
        },
      }),
    );

    return {
      ok: true,
    };
  }

  /**
   * 3️⃣ Listar archivos del evento
   */
  async listFiles() {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': EVENT_ID,
          ':sk': 'FILE#',
        },
        ScanIndexForward: false, // más recientes primero
      }),
    );

    return result.Items ?? [];
  }

  async listFilesWithUrls() {
    const files = await this.listFiles();

    return Promise.all(
      files.map(async (file: any) => ({
        ...file,
        url: await this.s3Service.generateDownloadUrl(file.s3Key),
      })),
    );
  }
}
