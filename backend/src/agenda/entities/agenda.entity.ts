import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';

/**
 * Entidad que representa la agenda académica de un docente para un periodo específico.
 */
@Entity({ name: 'agenda_docente' })
@Unique(['id_docente', 'id_periodo'])
export class AgendaDocente {
    @PrimaryGeneratedColumn()
    id_agenda: number;

    @Column()
    id_docente: number;

    @Column()
    id_periodo: number;

    @Column({ type: 'date' })
    fecha_diligenciamiento: Date;

    @Column({
        type: 'enum',
        enum: ['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'En_Elaboracion', 'En_Revision', 'Con_Observaciones'],
        default: 'En_Elaboracion',
    })
    estado: string;

    /** Fecha de inicio del semestre académico. */
    @Column({ type: 'date' })
    inicio_semestre: Date;

    /** Fecha de fin del semestre académico. */
    @Column({ type: 'date' })
    fin_semestre: Date;

    @ManyToOne('Docente', 'agendas')
    @JoinColumn({ name: 'id_docente' })
    docente: any;

    @ManyToOne('PeriodoAcademico', 'agendas')
    @JoinColumn({ name: 'id_periodo' })
    periodo: any;

    @OneToMany('Actividad', 'agenda')
    actividades: any[];

    @OneToMany('Informe', 'agenda')
    informes: any[];
}
