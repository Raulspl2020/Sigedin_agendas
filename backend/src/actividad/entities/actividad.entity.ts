import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

/**
 * Entidad que representa una actividad específica dentro de la agenda de un docente.
 */
@Entity({ name: 'actividad' })
export class Actividad {
    @PrimaryGeneratedColumn()
    id_actividad: number;

    @Column()
    id_agenda: number;

    @Column()
    id_tipo: number;

    @Column({ length: 200 })
    nombre: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ type: 'decimal', precision: 4, scale: 2 })
    horas_semanales: number;

    @Column({ length: 200, nullable: true })
    fuente_verificacion: string;

    @Column({ type: 'text', nullable: true })
    evidencia_esperada: string;

    @ManyToOne('AgendaDocente', 'actividades')
    @JoinColumn({ name: 'id_agenda' })
    agenda: any;

    @ManyToOne('TipoActividad', 'actividades')
    @JoinColumn({ name: 'id_tipo' })
    tipoActividad: any;

    @OneToMany('SeguimientoSemanal', 'actividad')
    seguimientos: any[];
}
