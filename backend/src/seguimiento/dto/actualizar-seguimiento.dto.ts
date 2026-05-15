import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ActualizarSeguimientoDto {
    @IsNumber()
    @IsOptional()
    @Min(0.01)
    horas_ejecutadas?: number;

    @IsString()
    @IsOptional()
    observaciones?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(24)
    semana?: number;
}
