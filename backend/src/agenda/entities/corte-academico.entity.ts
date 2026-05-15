import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity({ name: 'corte_academico' })
export class CorteAcademico {
    @PrimaryGeneratedColumn()
    id_corte: number;

    @Column()
    id_periodo: number;

    @Column({ type: 'tinyint' })
    numero_corte: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    nombre: string;

    @Column({ type: 'date' })
    fecha_inicio: Date;

    @Column({ type: 'date' })
    fecha_fin: Date;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    porcentaje_evaluacion: number;

    @ManyToOne('PeriodoAcademico')
    @JoinColumn({ name: 'id_periodo' })
    periodo: any;
}
