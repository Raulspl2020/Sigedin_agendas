import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';

@Entity({ name: 'plan_corte_actividad' })
@Unique(['id_actividad', 'id_corte'])
export class PlanCorteActividad {
    @PrimaryGeneratedColumn()
    id_plan_corte: number;

    @Column()
    id_actividad: number;

    @Column()
    id_corte: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
    horas_planeadas: number;

    @Column({ name: 'Numero_semanas', type: 'decimal', precision: 6, scale: 2, default: 0 })
    numero_semanas: number;

    @ManyToOne('Actividad')
    @JoinColumn({ name: 'id_actividad' })
    actividad: any;

    @ManyToOne('CorteAcademico')
    @JoinColumn({ name: 'id_corte' })
    corte: any;
}
