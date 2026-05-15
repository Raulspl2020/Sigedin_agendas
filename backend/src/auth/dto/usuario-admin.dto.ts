import { IsString, IsEnum, IsNumber, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * DTO para la creación de un usuario.
 */
export class CrearUsuarioDto {
    @IsString()
    @MaxLength(50)
    username: string;

    @IsString()
    @MinLength(6)
    password?: string;

    @IsEnum(['ADMIN', 'DECANO', 'DOCENTE'])
    rol: string;

    @IsOptional()
    @IsNumber()
    id_docente?: number;

    @IsOptional()
    @IsNumber()
    activo?: number;
}

/**
 * DTO para la actualización de un usuario.
 */
export class ActualizarUsuarioDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    username?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsEnum(['ADMIN', 'DECANO', 'DOCENTE'])
    rol?: string;

    @IsOptional()
    @IsNumber()
    id_docente?: number;

    @IsOptional()
    @IsNumber()
    activo?: number;
}
