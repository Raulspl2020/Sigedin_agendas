import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

/**
 * Entidad que representa a un usuario del sistema (Admin, Decano o Docente).
 */
@Entity({ name: 'usuario' })
export class Usuario {
    @PrimaryGeneratedColumn()
    id_usuario: number;

    @Column({ unique: true, length: 50 })
    username: string;

    @Column({ length: 255 })
    password_hash: string;

    @Column({
        type: 'enum',
        enum: ['ADMIN', 'DECANO', 'DOCENTE'],
    })
    rol: string;

    @Column({ nullable: true })
    id_docente: number;

    @Column({ type: 'tinyint', default: 1 })
    activo: number;

    @ManyToOne('Docente', 'usuarios')
    @JoinColumn({ name: 'id_docente' })
    docente: any;
}
