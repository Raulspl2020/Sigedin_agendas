import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';

/**
 * Entidad que representa un periodo académico (Año y Semestre).
 */
@Entity({ name: 'periodo_academico' })
@Unique(['anio', 'periodo'])
export class PeriodoAcademico {
    @PrimaryGeneratedColumn()
    id_periodo: number;

    @Column()
    anio: number;

    @Column({
        type: 'enum',
        enum: ['A', 'B'],
    })
    periodo: string;

    @Column({ type: 'date', nullable: true })
    fecha_inicio: Date;

    @Column({ type: 'date', nullable: true })
    fecha_fin: Date;

    @OneToMany('AgendaDocente', 'periodo')
    agendas: any[];
}
