import {
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  UsePipes,
  ValidationPipe,
  Body,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateRsvpDto } from './dto/update-rsvp.dto';
import { Throttle } from '@nestjs/throttler';
import { UpdateUserGenericDto } from './dto/update-user-generic.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('seed')
  seed() {
    return this.usersService.seedUsers();
  }

  @Get('test')
  test() {
    return 'test';
  }


  @Throttle({
    default: {
      limit: 3,
      ttl: 60,
    },
  })
  @Get('by-code/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    console.log(`PEDIDO EL CODIGO ${codigo}`)
    return this.usersService.findByCodigo(codigo);
  }

  @Delete('purge')
  purge() {
    return this.usersService.deleteAllUsers();
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: 60,
    },
  })
  @Get(':userId')
  findByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.findByUserId(userId);
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: 60,
    },
  })
  @Patch(':userId/rsvp')
  updateRsvp(@Param('userId') userId: string, @Body() body: UpdateRsvpDto) {
    console.log({body})
    return this.usersService.updateRsvp(userId, body);
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: 60,
    },
  })
  @Get('by-code/:codigo/summary')
  getSummary(@Param('codigo') codigo: string) {
    return this.usersService.getSummaryByCodigo(codigo);
  }

  
  @Throttle({
    default: {
      limit: 3,
      ttl: 60,
    },
  })
  // users.controller.ts
  @Patch(':codigo/:userId')
  async updateUserAnyField(
    @Param('codigo') codigo: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserGenericDto,
  ) {
    return this.usersService.updateAnyFieldByCode(userId, codigo, dto.data);
  }
    
}
