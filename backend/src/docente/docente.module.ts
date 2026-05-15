import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Docente } from './entities/docente.entity';
import { Programa } from './entities/programa.entity';
import { Facultad } from './entities/facultad.entity';
import { ConfiguracionDedicacion } from './entities/dedicacion.entity';

import { DocenteController } from './docente.controller';
import { DocenteService } from './docente.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Docente, Programa, Facultad, ConfiguracionDedicacion]), AuthModule],
    controllers: [DocenteController],
    providers: [DocenteService],
    exports: [DocenteService],
})
export class DocenteModule { }
