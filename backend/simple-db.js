const mysql = require('mysql2/promise');
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

        const [usuarios] = await connection.execute('SELECT username, rol, password_hash FROM usuario');
        console.log('--- USUARIOS ---');
        usuarios.forEach(u => {
            console.log(`- ${u.username} (${u.rol})`);
        });

        const [docentes] = await connection.execute('SELECT id_docente, nombres FROM docente');
        console.log('\n--- DOCENTES ---');
        docentes.forEach(d => {
            console.log(`- ID: ${d.id_docente}, Nombre: ${d.nombres}`);
        });

        await connection.end();
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

main();
