import {
    IsNumber,
    IsNotEmpty,
    IsDateString,
    IsOptional,
    IsEnum,
} from 'class-validator';

/**
 * Objeto de transferencia de datos para crear una agenda.
 * Incluye todos los campos de la tabla agenda_docente.
 */
export class CrearAgendaDto {
    @IsNumber()
    @IsNotEmpty()
    id_periodo: number;

    @IsNumber()
    @IsOptional()
    id_docente?: number;

    @IsDateString()
    @IsNotEmpty()
    fecha_diligenciamiento: string;

    @IsEnum(['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'En_Elaboracion', 'En_Revision', 'Con_Observaciones'])
    @IsOptional()
    estado?: string;

    /**
     * Fecha de inicio del semestre (formato ISO: YYYY-MM-DD).
     * Campo obligatorio según la definición de la tabla `agenda_docente`.
     */
    @IsDateString()
    @IsNotEmpty()
    inicio_semestre: string;

    /**
     * Fecha de fin del semestre (formato ISO: YYYY-MM-DD).
     * Campo obligatorio según la definición de la tabla `agenda_docente`.
     */
    @IsDateString()
    @IsNotEmpty()
    fin_semestre: string;

}
