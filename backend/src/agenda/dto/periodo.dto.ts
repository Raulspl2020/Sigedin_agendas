import { IsNumber, IsEnum, IsDateString, IsOptional, IsInt, IsString, Min, Max, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CortePeriodoDto {
    @IsInt()
    @Min(1)
    @Max(3)
    numero_corte: number;

    @IsOptional()
    @IsString()
    nombre?: string;

    @IsDateString({}, { message: 'La fecha inicio del corte debe tener formato válido (AAAA-MM-DD)' })
    fecha_inicio: string;

    @IsDateString({}, { message: 'La fecha fin del corte debe tener formato válido (AAAA-MM-DD)' })
    fecha_fin: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    porcentaje_evaluacion?: number | null;
}

/**
 * DTO para la creación de un periodo académico.
 */
export class CrearPeriodoDto {
    @IsNumber()
    anio: number;

    @IsEnum(['A', 'B'], {
        message: 'El periodo debe ser A o B',
    })
    periodo: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de inicio debe tener un formato válido (AAAA-MM-DD)' })
    fecha_inicio?: string | null;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de fin debe tener un formato válido (AAAA-MM-DD)' })
    fecha_fin?: string | null;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CortePeriodoDto)
    cortes?: CortePeriodoDto[];
}

/**
 * DTO para la actualización de un periodo académico.
 */
export class ActualizarPeriodoDto {
    @IsOptional()
    @IsNumber()
    anio?: number;

    @IsOptional()
    @IsEnum(['A', 'B'], {
        message: 'El periodo debe ser A o B',
    })
    periodo?: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de inicio debe tener un formato válido (AAAA-MM-DD)' })
    fecha_inicio?: string | null;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de fin debe tener un formato válido (AAAA-MM-DD)' })
    fecha_fin?: string | null;
}
