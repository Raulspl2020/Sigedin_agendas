import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guardia que utiliza la estrategia JWT para proteger rutas.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }
