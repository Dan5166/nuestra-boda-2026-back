import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { awsConfig } from '../config/aws.config';

@Injectable()
export class S3Service {
  private s3 = new S3Client({
    region: awsConfig.region,
    credentials: awsConfig.credentials,
  });

  async generateUploadUrl(
    key: string,
    contentType: string,
  ): Promise<string> {
    console.log('🔥 S3Service CORRECTO CARGADO');
    console.log('USANDO KEY:', key);

    const command = new PutObjectCommand({
      Bucket: awsConfig.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: 60 * 5,
    });
  }

  // 🔽 DESCARGA / VISUALIZACIÓN (ESTO ES LO NUEVO)
  async generateDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: awsConfig.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: 60 * 10, // 10 minutos
    });
  }
}
