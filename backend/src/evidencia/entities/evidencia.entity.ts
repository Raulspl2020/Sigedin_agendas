import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

/**
 * Entidad que representa una evidencia (archivo) asociada a un seguimiento semanal.
 */
@Entity({ name: 'evidencia' })
export class Evidencia {
    @PrimaryGeneratedColumn()
    id_evidencia: number;

    @Column()
    id_seguimiento: number;

    @Column({ length: 255 })
    nombre_archivo: string;

    @Column({ length: 255 })
    ruta_archivo: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ nullable: true })
    usuario_carga: number;

    @Column({ type: 'tinyint', default: 0 })
    validado: number;

    @Column({ type: 'tinyint', default: 1 })
    activo: number;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_carga: Date;

    @ManyToOne('SeguimientoSemanal', 'evidencias', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_seguimiento' })
    seguimiento: any;
}
