import * as passportJwt from 'passport-jwt';
const { Strategy, ExtractJwt } = passportJwt;
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Estrategia para validar tokens JWT en las peticiones.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-key-ITP',
        });
    }

    async validate(payload: any) {
        return {
            id_usuario: payload.sub,
            username: payload.username,
            rol: payload.rol,
            id_docente: payload.id_docente
        };
    }
}
