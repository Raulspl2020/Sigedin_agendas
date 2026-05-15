import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EvidenciaService } from './evidencia.service';

const MAX_EVIDENCIA_SIZE_BYTES = 20 * 1024 * 1024;

const evidenciaFileFilter = (_req: any, file: any, cb: (error: any, acceptFile: boolean) => void) => {
    const nombre = String(file?.originalname || '').toLowerCase();
    const mime = String(file?.mimetype || '').toLowerCase();
    const esPdf = mime === 'application/pdf' || nombre.endsWith('.pdf');

    if (!esPdf) {
        cb(new BadRequestException('Solo se permiten archivos PDF'), false);
        return;
    }

    cb(null, true);
};

@Controller('evidencia')
@UseGuards(JwtAuthGuard)
export class EvidenciaController {
    constructor(private readonly evidenciaServicio: EvidenciaService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('archivo', {
        limits: { fileSize: MAX_EVIDENCIA_SIZE_BYTES },
        fileFilter: evidenciaFileFilter,
    }))
    subir(
        @Request() req: any,
        @UploadedFile() archivo: any,
        @Body('id_seguimiento', ParseIntPipe) idSeguimiento: number,
        @Body('descripcion') descripcion?: string,
    ) {
        return this.evidenciaServicio.subir(idSeguimiento, archivo, descripcion, req.user);
    }

    @Get('seguimiento/:id_seguimiento')
    listarPorSeguimiento(@Request() req: any, @Param('id_seguimiento', ParseIntPipe) idSeguimiento: number) {
        return this.evidenciaServicio.listarPorSeguimiento(idSeguimiento, req.user);
    }

    @Get(':id_seguimiento')
    listar(@Request() req: any, @Param('id_seguimiento', ParseIntPipe) idSeguimiento: number) {
        return this.evidenciaServicio.listarPorSeguimiento(idSeguimiento, req.user);
    }

    @Delete(':id_evidencia')
    eliminar(@Request() req: any, @Param('id_evidencia', ParseIntPipe) idEvidencia: number) {
        return this.evidenciaServicio.eliminar(idEvidencia, req.user);
    }
}
