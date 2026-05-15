import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DocenteModule } from './docente/docente.module';
import { AgendaModule } from './agenda/agenda.module';
import { ActividadModule } from './actividad/actividad.module';
import { SeguimientoModule } from './seguimiento/seguimiento.module';
import { EvidenciaModule } from './evidencia/evidencia.module';
import { InformesModule } from './informes/informes.module';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Configuración de TypeORM para MariaDB
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // No sincronizar para no alterar el esquema existente
        logging: true,
      }),
    }),
    AuthModule,
    DocenteModule,
    AgendaModule,
    ActividadModule,
    SeguimientoModule,
    EvidenciaModule,
    InformesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule { }
