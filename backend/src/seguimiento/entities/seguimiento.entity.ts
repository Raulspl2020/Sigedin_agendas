import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Check } from 'typeorm';

/**
 * Entidad que representa el seguimiento semanal de una actividad.
 */
@Entity({ name: 'seguimiento_semanal' })
@Check('`semana` BETWEEN 1 AND 24')
export class SeguimientoSemanal {
    @PrimaryGeneratedColumn()
    id_seguimiento: number;

    @Column()
    id_actividad: number;

    @Column()
    id_corte: number;

    @Column({ type: 'tinyint' })
    semana: number;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    horas_ejecutadas: number;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_registro: Date;

    @ManyToOne('Actividad', 'seguimientos', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_actividad' })
    actividad: any;

    @ManyToOne('CorteAcademico', { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'id_corte' })
    corte: any;

    @OneToMany('Evidencia', 'seguimiento')
    evidencias: any[];
}
