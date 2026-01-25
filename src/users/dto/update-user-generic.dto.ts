// update-user-generic.dto.ts
import { IsObject } from 'class-validator';

export class UpdateUserGenericDto {
  @IsObject()
  data: Record<string, any>;
}
