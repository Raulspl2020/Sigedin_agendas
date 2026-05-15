import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CrearCorteAcademicoDto {
    @IsInt()
    @IsNotEmpty()
    id_periodo: number;

    @IsInt()
    @Min(1)
    @Max(3)
    numero_corte: number;

    @IsOptional()
    @IsString()
    nombre?: string;

    @IsDateString()
    @IsNotEmpty()
    fecha_inicio: string;

    @IsDateString()
    @IsNotEmpty()
    fecha_fin: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    porcentaje_evaluacion?: number;
}

export class ActualizarCorteAcademicoDto {
    @IsOptional()
    @IsInt()
    id_periodo?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(3)
    numero_corte?: number;

    @IsOptional()
    @IsString()
    nombre?: string;

    @IsOptional()
    @IsDateString()
    fecha_inicio?: string;

    @IsOptional()
    @IsDateString()
    fecha_fin?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    porcentaje_evaluacion?: number;
}
