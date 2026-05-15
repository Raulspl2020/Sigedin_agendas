import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Usuario } from './entities/usuario.entity';
import { JwtStrategy } from './jwt.strategy';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';
import { ScopeService } from './scope.service';
import { AdminScopeController } from './admin-scope.controller';
import { PerfilController } from './perfil.controller';
import { Docente } from '../docente/entities/docente.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Usuario, Docente]),
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '8h' },
            }),
        }),
    ],
    providers: [AuthService, JwtStrategy, UsuarioService, ScopeService],
    controllers: [AuthController, UsuarioController, AdminScopeController, PerfilController],
    exports: [AuthService, UsuarioService, ScopeService],
})
export class AuthModule { }
