import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

/**
 * DTO para la creación de un tipo de actividad.
 */
export class CrearTipoActividadDto {
    @IsString()
    @MaxLength(100)
    nombre: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    max_horas_semana?: number;
}

/**
 * DTO para la actualización de un tipo de actividad.
 */
export class ActualizarTipoActividadDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nombre?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    max_horas_semana?: number;
}
