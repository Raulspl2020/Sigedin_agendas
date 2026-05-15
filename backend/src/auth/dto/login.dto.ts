import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * Objeto de transferencia de datos para el login.
 */
export class LoginDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
    usuario: string;

    @IsString()
    @IsNotEmpty({ message: 'La contraseña es requerida' })
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    clave: string;
}
