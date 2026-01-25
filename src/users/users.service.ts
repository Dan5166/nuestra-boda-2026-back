import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  PutCommand,
  ScanCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { validateOrReject } from 'class-validator';
import { randomUUID } from 'crypto';
import { dynamoClient } from '../dynamodb/dynamodb.client';
import { UserEntity, AlergiaAlimentaria } from './entities/user.entity';
import { usuariosSeed } from './usuarios_seed';
import { UpdateRsvpDto } from './dto/update-rsvp.dto';
import { assertRsvpOpen } from './rsvp.utils';
import { RSVP_DEADLINE } from './rsvp.config';
import { EstadoUsuario } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly TABLE_NAME = 'Users';

  // 🌱 SEED CON UUID (SK)
  async seedUsers() {
    this.logger.log('🌱 Iniciando seed de usuarios');

    type SeedResult = {
      nombre: string;
      codigo: string;
      status: 'insertado' | 'error';
      error?: string;
    };

    const results: SeedResult[] = [];

    for (const rawUser of usuariosSeed) {
      try {
        const user = new UserEntity({
          userId: randomUUID(), // ✅ INMUTABLE
          ...rawUser,
          alergiaAlimentaria: rawUser.alergiaAlimentaria as AlergiaAlimentaria,
        });

        await validateOrReject(user);

        await dynamoClient.send(
          new PutCommand({
            TableName: this.TABLE_NAME,
            Item: {
              PK: `CODE#${user.codigo}`,
              SK: `USER#${user.userId}`,

              userId: user.userId,
              codigo: user.codigo,
              nombre: user.nombre,
              telefono: user.telefono,
              mail: user.mail,
              estado: user.estado,
              alergiaAlimentaria: user.alergiaAlimentaria,
              createdAt: user.createdAt,
            },
            ConditionExpression:
              'attribute_not_exists(PK) AND attribute_not_exists(SK)',
          }),
        );

        results.push({
          nombre: user.nombre,
          codigo: user.codigo,
          status: 'insertado',
        });
      } catch (error: any) {
        this.logger.warn(
          `⚠️ ${rawUser.nombre} (${rawUser.codigo}) no insertado`,
        );

        this.logger.warn(error);

        results.push({
          nombre: rawUser.nombre,
          codigo: rawUser.codigo,
          status: 'error',
          error: error?.name ?? 'UNKNOWN_ERROR',
        });
      }
    }

    return {
      total: usuariosSeed.length,
      detalle: results,
    };
  }

  // 🧹 BORRAR TODO (PELIGROSO)
  async deleteAllUsers() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Delete all disabled in production');
    }

    this.logger.warn('🔥 BORRANDO TODOS LOS ITEMS DE LA TABLA');

    // 1️⃣ Scan (obligatorio para borrar todo)
    const scan = await dynamoClient.send(
      new ScanCommand({
        TableName: this.TABLE_NAME,
        ProjectionExpression: 'PK, SK',
      }),
    );

    if (!scan.Items || scan.Items.length === 0) {
      return { deleted: 0 };
    }

    // 2️⃣ Delete uno a uno
    for (const item of scan.Items) {
      await dynamoClient.send(
        new DeleteCommand({
          TableName: this.TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        }),
      );
    }

    return {
      deleted: scan.Items.length,
    };
  }

  async findByCodigo(codigo: string) {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: this.TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `CODE#${codigo}`,
        },
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      throw new NotFoundException('Código de invitación no válido');
    }

    return {
      codigo,
      usuarios: result.Items.map((item) => ({
        userId: item.userId,
        nombre: item.nombre,
        estado: item.estado,
      })),
    };
  }

  async findByUserId(userId: string) {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: this.TABLE_NAME,
        FilterExpression: 'userId = :uid',
        ExpressionAttributeValues: {
          ':uid': userId,
        },
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const user = result.Items[0];

    return {
      userId: user.userId,
      nombre: user.nombre,
      telefono: user.telefono ?? null,
      mail: user.mail ?? null,
      estado: user.estado,
      alergiaAlimentaria: user.alergiaAlimentaria,
      otrasAlergias: user.otrasAlergias ?? null,
      mensaje: user.mensaje ?? null,
      codigo: user.codigo,
    };
  }

  async updateRsvp(userId: string, dto: UpdateRsvpDto) {
    // 1. Buscar el item real (para obtener el código)
    const user = await this.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const codigo = user.codigo; // ej: FM896

    // 2. Actualizar el RSVP usando la key REAL
    return this.updateRsvpByCode(userId, codigo, dto, user.estado);
  }

  async updateRsvpByCode(
    userId: string,
    codigo: string,
    dto: UpdateRsvpDto,
    estado_anterior: string,
  ) {
    console.log('SERVICE DTO:', dto);
  console.log('USER ID:', userId);
    const updateExpressions: string[] = [];
    const removeExpressions: string[] = [];
    const expressionValues: Record<string, any> = {};
    const expressionNames: Record<string, string> = {};

    const now = new Date().toISOString();

    // Campos a actualizar si vienen en el DTO
    if (dto.alergiaAlimentaria) {
      updateExpressions.push('#alergiaAlimentaria = :alergiaAlimentaria');
      expressionNames['#alergiaAlimentaria'] = 'alergiaAlimentaria';
      expressionValues[':alergiaAlimentaria'] = dto.alergiaAlimentaria;
    }

    if (dto.mail) {
      updateExpressions.push('#mail = :mail');
      expressionNames['#mail'] = 'mail';
      expressionValues[':mail'] = dto.mail;
    }

    if (dto.telefono) {
      updateExpressions.push('#telefono = :telefono');
      expressionNames['#telefono'] = 'telefono';
      expressionValues[':telefono'] = dto.telefono;
    }

    if (dto.mensaje) {
      updateExpressions.push('#mensaje = :mensaje');
      expressionNames['#mensaje'] = 'mensaje';
      expressionValues[':mensaje'] = dto.mensaje;
    }

    if (dto.otrasAlergias) {
      updateExpressions.push('#otrasAlergias = :otrasAlergias');
      expressionNames['#otrasAlergias'] = 'otrasAlergias';
      expressionValues[':otrasAlergias'] = dto.otrasAlergias;
    }

    if (dto.estado) {
      updateExpressions.push('#estado = :estado');
      expressionNames['#estado'] = 'estado';
      expressionValues[':estado'] = dto.estado;
    }

    // Manejo de rsvpAt
    if (
      dto.estado == 'confirmado' &&
      estado_anterior == EstadoUsuario.PENDIENTE
    ) {
      updateExpressions.push('#rsvpAt = :rsvpAt');
      expressionNames['#rsvpAt'] = 'rsvpAt';
      expressionValues[':rsvpAt'] = now;
    }

    // Manejo de rsvpAt
    if (
      dto.estado == 'pendiente' &&
      estado_anterior == EstadoUsuario.PENDIENTE
    ) {
      // Si es nueva entrada, remover rsvpAt
      console.log('NUEVA ENTRADA EN UPDTRSVP');
      removeExpressions.push('#rsvpAt');
      expressionNames['#rsvpAt'] = 'rsvpAt';
    }

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionNames['#updatedAt'] = 'updatedAt';
    expressionValues[':updatedAt'] = now;

    // Validación: si no hay nada que actualizar o remover
    if (!updateExpressions.length && !removeExpressions.length) {
      throw new BadRequestException('Nada para actualizar');
    }

    // Construcción de UpdateExpression correcta
    let UpdateExpression = '';
    if (updateExpressions.length) {
      UpdateExpression += `SET ${updateExpressions.join(', ')}`;
    }
    if (removeExpressions.length) {
      if (UpdateExpression) UpdateExpression += ' ';
      UpdateExpression += `REMOVE ${removeExpressions.join(', ')}`;
    }

    const command = new UpdateCommand({
      TableName: 'Users',
      Key: {
        PK: `CODE#${codigo}`,
        SK: `USER#${userId}`,
      },
      UpdateExpression,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoClient.send(command);
    return result.Attributes;
  }

  async getSummaryByCodigo(codigo: string) {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: this.TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `CODE#${codigo}`,
        },
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      throw new NotFoundException('Código no válido');
    }

    const estados = result.Items.map((u) => u.estado);

    return {
      codigo,
      total: estados.length,
      confirmados: estados.filter((e) => e === 'confirmado').length,
      rechazados: estados.filter((e) => e === 'rechazado').length,
      pendientes: estados.filter((e) => e === 'pendiente').length,
      cerrado: new Date() > RSVP_DEADLINE,
    };
  }

  async updateAnyFieldByCode(
  userId: string,
  codigo: string,
  data: Record<string, any>,
) {
  const allowedFields = [
    'nombre',
    'mail',
    'telefono',
    'estado',
    'mensaje',
    'alergiaAlimentaria',
    'otrasAlergias',
    'rsvpAt',
  ];

  if (!data || Object.keys(data).length === 0) {
    throw new BadRequestException('No hay campos para actualizar');
  }

  const updateExpressions: string[] = [];
  const removeExpressions: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, any> = {};

  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(data)) {
    // 🔐 seguridad: solo campos permitidos
    if (!allowedFields.includes(key)) {
      throw new BadRequestException(`Campo no permitido: ${key}`);
    }

    const attrName = `#${key}`;
    const attrValue = `:${key}`;

    expressionNames[attrName] = key;

    if (value === null || value === undefined) {
      // DynamoDB REMOVE
      removeExpressions.push(attrName);
    } else {
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionValues[attrValue] = value;
    }
  }

  // updatedAt siempre
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionNames['#updatedAt'] = 'updatedAt';
  expressionValues[':updatedAt'] = now;

  let UpdateExpression = '';

  if (updateExpressions.length) {
    UpdateExpression += `SET ${updateExpressions.join(', ')}`;
  }

  if (removeExpressions.length) {
    if (UpdateExpression) UpdateExpression += ' ';
    UpdateExpression += `REMOVE ${removeExpressions.join(', ')}`;
  }

  const command = new UpdateCommand({
    TableName: 'Users',
    Key: {
      PK: `CODE#${codigo}`,
      SK: `USER#${userId}`,
    },
    UpdateExpression,
    ExpressionAttributeNames: expressionNames,
    ExpressionAttributeValues:
      Object.keys(expressionValues).length > 0
        ? expressionValues
        : undefined,
    ReturnValues: 'ALL_NEW',
  });

  const result = await dynamoClient.send(command);
  return result.Attributes;
}

}
