import {
  IsEnum,
  IsOptional,
  IsString,
  IsPhoneNumber,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { EstadoUsuario, AlergiaAlimentaria } from '../entities/user.entity';

export class UpdateRsvpDto {
  @IsPhoneNumber('CL')
  telefono: string;

  @IsOptional()
  @IsEmail()
  mail?: string;

  @IsEnum(EstadoUsuario)
  estado: EstadoUsuario;

  @IsOptional()
  @IsEnum(AlergiaAlimentaria)
  alergiaAlimentaria?: AlergiaAlimentaria;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  otrasAlergias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensaje?: string;
}
