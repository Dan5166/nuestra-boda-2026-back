// aws.config.ts
import * as dotenv from 'dotenv';

dotenv.config();

export const awsConfig = {
  region: process.env.AWS_REGION!,
  bucket: process.env.AWS_S3_BUCKET!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
};
