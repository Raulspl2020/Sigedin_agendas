import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

/**
 * Entidad que representa los tipos de actividades (Docencia, Investigación, etc.).
 */
@Entity({ name: 'tipo_actividad' })
export class TipoActividad {
    @PrimaryGeneratedColumn()
    id_tipo: number;

    @Column({ length: 100 })
    nombre: string;

    @Column({ nullable: true })
    max_horas_semana: number;

    @OneToMany('Actividad', 'tipoActividad')
    actividades: any[];
}
