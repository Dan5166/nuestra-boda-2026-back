import { Controller, Post, Get, Body } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * 1️⃣ Generar URL firmada para subir archivo
   * POST /files/upload-url
   */
  @Post('upload-url')
  createUploadUrl(@Body() dto: { filename: string; contentType: string }) {
    console.log("INTENTANDO ENTRAR A CREATE UPLOAD URL")
    return this.filesService.createUploadUrl(dto);
  }

  /**
   * 2️⃣ Confirmar subida y guardar metadata
   * POST /files/confirm
   */
  @Post('confirm')
  async confirmUpload(
    @Body()
    body: {
      fileId: string;
      key: string;
      contentType: string;
      size: number;
    },
  ) {
    return this.filesService.confirmUpload(body);
  }

  /**
   * 3️⃣ Listar archivos del evento
   * GET /files
   */
  @Get()
getFiles() {
  return this.filesService.listFilesWithUrls();
}

}
