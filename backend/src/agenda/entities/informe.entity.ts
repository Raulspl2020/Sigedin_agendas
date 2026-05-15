import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AgendaDocente } from './agenda.entity';

/**
 * Entidad que representa los informes de corte (Primer, Segundo, Final).
 */
@Entity({ name: 'informe' })
export class Informe {
    @PrimaryGeneratedColumn()
    id_informe: number;

    @Column()
    id_agenda: number;

    @Column({
        type: 'enum',
        enum: ['Primer Corte', 'Segundo Corte', 'Final'],
    })
    tipo_informe: string;

    @Column({ type: 'date', nullable: true })
    fecha_entrega: Date;

    @Column({
        type: 'enum',
        enum: ['Pendiente', 'Entregado', 'Aprobado', 'Rechazado'],
        default: 'Pendiente',
    })
    estado: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @ManyToOne(() => AgendaDocente, (agenda) => agenda.informes)
    @JoinColumn({ name: 'id_agenda' })
    agenda: AgendaDocente;
}
