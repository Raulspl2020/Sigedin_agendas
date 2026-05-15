import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SubirEvidenciaDto {
    @IsNumber()
    id_seguimiento: number;

    @IsString()
    @IsOptional()
    descripcion?: string;
}
