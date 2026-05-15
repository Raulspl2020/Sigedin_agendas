const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DATABASE_HOST,
            port: Number(process.env.DATABASE_PORT),
            user: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
        });

        const username = 'admin';
        const password = 'admin123';
        const password_hash = await bcrypt.hash(password, 10);
        const rol = 'ADMIN';

        // Verificar si ya existe
        const [rows] = await connection.execute('SELECT id_usuario FROM usuario WHERE username = ?', [username]);

        if (rows.length === 0) {
            await connection.execute(
                'INSERT INTO usuario (username, password_hash, rol, activo) VALUES (?, ?, ?, 1)',
                [username, password_hash, rol]
            );
            console.log(`USUARIO CREADO EXITOSAMENTE:`);
            console.log(`- Usuario: ${username}`);
            console.log(`- Clave: ${password}`);
        } else {
            console.log('El usuario admin ya existe.');
        }

        await connection.end();
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

main();
