import { createConnection } from 'typeorm';
import { Usuario } from './src/auth/entities/usuario.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function debug() {
    const connection = await createConnection({
        type: 'mariadb',
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        entities: [Usuario],
        synchronize: false,
    });

    const usuarioRepo = connection.getRepository(Usuario);
    const usuarios = await usuarioRepo.find();
    console.log('USUARIOS ENCONTRADOS:');
    usuarios.forEach(u => {
        console.log(`- Usuario: ${u.username}, Rol: ${u.rol}`);
    });
    await connection.close();
}

debug().catch(console.error);
