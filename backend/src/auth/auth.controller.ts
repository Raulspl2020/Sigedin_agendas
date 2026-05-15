import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Controlador que expone los endpoints de autenticación.
 */
@Controller('auth')
export class AuthController {
    constructor(private readonly authServicio: AuthService) { }

    /**
     * Endpoint para iniciar sesión.
     */
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        const usuario = await this.authServicio.validarUsuario(loginDto);
        if (!usuario) {
            throw new UnauthorizedException('Credenciales inválidas');
        }
        return this.authServicio.login(usuario);
    }
}
