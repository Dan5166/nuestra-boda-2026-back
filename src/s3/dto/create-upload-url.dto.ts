import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsIn([
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
  ])
  contentType: string;
}
