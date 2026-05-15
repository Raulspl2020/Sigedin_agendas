import { IsNumber, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';

/**
 * Objeto de transferencia de datos para registrar un seguimiento semanal.
 */
export class CrearSeguimientoDto {
    @IsNumber()
    @IsNotEmpty()
    id_actividad: number;

    @IsNumber()
    @IsOptional()
    id_corte?: number;

    @IsNumber()
    @Min(1)
    @Max(24)
    semana: number;

    @IsNumber()
    @Min(0.01)
    horas_ejecutadas: number;

    @IsString()
    @IsOptional()
    observaciones?: string;
}
