import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO para la creación de una facultad.
 */
export class CrearFacultadDto {
    @IsString()
    @MaxLength(150)
    nombre: string;
}

/**
 * DTO para la actualización de una facultad.
 */
export class ActualizarFacultadDto {
    @IsOptional()
    @IsString()
    @MaxLength(150)
    nombre?: string;
}

/**
 * DTO para la creación de un programa.
 */
export class CrearProgramaDto {
    @IsNumber()
    id_facultad: number;

    @IsString()
    @MaxLength(150)
    nombre: string;
}

/**
 * DTO para la actualización de un programa.
 */
export class ActualizarProgramaDto {
    @IsOptional()
    @IsNumber()
    id_facultad?: number;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    nombre?: string;
}
