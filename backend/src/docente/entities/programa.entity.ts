import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Facultad } from './facultad.entity';
import { Docente } from './docente.entity';

/**
 * Entidad que representa un programa académico asociado a una facultad.
 */
@Entity({ name: 'programa' })
export class Programa {
    @PrimaryGeneratedColumn()
    id_programa: number;

    @Column()
    id_facultad: number;

    @Column({ length: 150 })
    nombre: string;

    @ManyToOne(() => Facultad, (facultad) => facultad.programas)
    @JoinColumn({ name: 'id_facultad' })
    facultad: Facultad;

    @OneToMany(() => Docente, (docente) => docente.programa)
    docentes: Docente[];
}
