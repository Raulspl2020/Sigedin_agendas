import { IsNumber, IsNotEmpty, IsString, IsOptional, Max, Min } from 'class-validator';

/**
 * Objeto de transferencia de datos para crear una actividad.
 */
export class CrearActividadDto {
    @IsNumber()
    @IsNotEmpty()
    id_agenda: number;

    @IsNumber()
    @IsNotEmpty()
    id_tipo: number;

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsNumber()
    @Min(0)
    @Max(40)
    horas_semanales: number;

    @IsString()
    @IsOptional()
    fuente_verificacion?: string;

    @IsString()
    @IsOptional()
    evidencia_esperada?: string;
}
