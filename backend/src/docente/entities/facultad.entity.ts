import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Programa } from './programa.entity';

/**
 * Entidad que representa una facultad en la institución.
 */
@Entity({ name: 'facultad' })
export class Facultad {
    @PrimaryGeneratedColumn()
    id_facultad: number;

    @Column({ length: 150 })
    nombre: string;

    @OneToMany(() => Programa, (programa) => programa.facultad)
    programas: Programa[];
}
