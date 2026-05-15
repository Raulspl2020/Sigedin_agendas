import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ActualizarPerfilDocenteDto {
    @IsOptional()
    @IsString()
    @MaxLength(150)
    nombres?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(150)
    mail?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
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
    @IsString()
    @MinLength(6)
    password_actual?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password_nueva?: string;
}
