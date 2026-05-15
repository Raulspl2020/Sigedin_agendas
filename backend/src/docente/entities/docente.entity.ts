import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

/**
 * Entidad que representa a un docente de la institución.
 */
@Entity({ name: 'docente' })
export class Docente {
    @PrimaryGeneratedColumn()
    id_docente: number;

    @Column({ unique: true, length: 20 })
    identificacion: string;

    @Column({ length: 150 })
    nombres: string;

    @Column({ length: 150 })
    mail: string;

    @Column({ length: 120 })
    sede: string;

    @Column({
        type: 'enum',
        enum: ['Carrera', 'Ocasional', 'Provisional', 'Planta'],
    })
    tipo_vinculacion: string;

    @Column({
        type: 'enum',
        enum: ['Tiempo Completo', 'Medio Tiempo', 'Hora Catedra'],
    })
    tipo_dedicacion: string;

    @Column({
        type: 'enum',
        enum: ['Auxiliar', 'Asistente', 'Asociado', 'Titular'],
    })
    escalafon: string;

    @Column({
        type: 'enum',
        enum: ['Diurna', 'Nocturna', 'Mixta'],
        default: 'Diurna',
    })
    franja: string;

    @Column()
    id_programa: number;

    @ManyToOne('Programa', 'docentes')
    @JoinColumn({ name: 'id_programa' })
    programa: any;

    @OneToMany('Usuario', 'docente')
    usuarios: any[];

    @OneToMany('AgendaDocente', 'docente')
    agendas: any[];
}
