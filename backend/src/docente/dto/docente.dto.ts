import { IsString, IsEnum, IsNumber, MaxLength, IsOptional, IsEmail, Matches } from 'class-validator';

/**
 * DTO para la creación de un docente.
 */
export class CrearDocenteDto {
    @IsString()
    @MaxLength(20)
    @Matches(/^\d+$/, { message: 'La identificación debe contener solo números' })
    identificacion: string;

    @IsString()
    @MaxLength(150)
    nombres: string;

    @IsEmail()
    @MaxLength(150)
    mail: string;

    @IsEnum(['Mocoa', 'Sibundoy'])
    sede: string;

    @IsEnum(['Carrera', 'Ocasional', 'Provisional', 'Planta'])
    tipo_vinculacion: string;

    @IsEnum(['Tiempo Completo', 'Medio Tiempo', 'Hora Catedra'])
    tipo_dedicacion: string;

    @IsEnum(['Auxiliar', 'Asistente', 'Asociado', 'Titular'])
    escalafon: string;

    @IsEnum(['Diurna', 'Nocturna', 'Mixta'])
    @IsOptional()
    franja?: string;

    @IsNumber()
    id_programa: number;
}

/**
 * DTO para la actualización de un docente.
 */
export class ActualizarDocenteDto {
    @IsOptional()
    @IsString()
    @MaxLength(150)
    nombres?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(150)
    mail?: string;

    @IsOptional()
    @IsEnum(['Mocoa', 'Sibundoy'])
    sede?: string;

    @IsOptional()
    @IsEnum(['Carrera', 'Ocasional', 'Provisional', 'Planta'])
    tipo_vinculacion?: string;

    @IsOptional()
    @IsEnum(['Tiempo Completo', 'Medio Tiempo', 'Hora Catedra'])
    tipo_dedicacion?: string;

    @IsOptional()
    @IsEnum(['Auxiliar', 'Asistente', 'Asociado', 'Titular'])
    escalafon?: string;

    @IsOptional()
    @IsEnum(['Diurna', 'Nocturna', 'Mixta'])
    franja?: string;

    @IsOptional()
    @IsNumber()
    id_programa?: number;
}
