import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evidencia } from './entities/evidencia.entity';
import { EvidenciaService } from './evidencia.service';
import { EvidenciaController } from './evidencia.controller';
import { SeguimientoSemanal } from '../seguimiento/entities/seguimiento.entity';
import { AuthModule } from '../auth/auth.module';
import { GoogleDriveService } from './services/google-drive.service';

@Module({
    imports: [TypeOrmModule.forFeature([Evidencia, SeguimientoSemanal]), AuthModule],
    controllers: [EvidenciaController],
    providers: [EvidenciaService, GoogleDriveService],
    exports: [EvidenciaService],
})
export class EvidenciaModule { }
