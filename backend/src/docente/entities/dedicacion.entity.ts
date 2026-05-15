import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Entidad que representa los límites de horas por tipo de dedicación.
 */
@Entity({ name: 'configuracion_dedicacion' })
export class ConfiguracionDedicacion {
    @PrimaryGeneratedColumn()
    id_config: number;

    @Column({ length: 50, nullable: true })
    tipo_dedicacion: string;

    @Column({ nullable: true })
    max_horas_semana: number;
}
