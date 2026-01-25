import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { S3Module } from 'src/s3/s3.module';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  imports: [S3Module]
})
export class FilesModule {}
