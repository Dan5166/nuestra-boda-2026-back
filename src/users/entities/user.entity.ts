import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum EstadoUsuario {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  RECHAZADO = 'rechazado',
  ERROR = 'error',
}

export enum AlergiaAlimentaria {
  NINGUNA = 'ninguna',
  VEGANA = 'vegana',
  CELIACA = 'celiaca',
  SIN_LACTOSA = 'sin lactosa',
}

export class UserEntity {
  // 🔑 Dominio
  @IsString()
  @IsNotEmpty()
  userId: string; // UUID (inmutable)

  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  telefono: string;

  @IsOptional()
  @IsString()
  mail?: string;

  @IsEnum(EstadoUsuario)
  estado: EstadoUsuario;

  @IsOptional()
  @IsEnum(AlergiaAlimentaria)
  alergiaAlimentaria?: AlergiaAlimentaria;

  createdAt: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, {
      estado: EstadoUsuario.PENDIENTE,
      createdAt: new Date().toISOString(),
      ...partial,
    });
  }
}
