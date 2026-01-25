// files/dto/confirm-upload.dto.ts
import { IsString, IsNumber } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  key: string;

  @IsString()
  contentType: string;

  @IsNumber()
  size: number;
}
