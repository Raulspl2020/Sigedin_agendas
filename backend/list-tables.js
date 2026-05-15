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

        const [tables] = await connection.execute('SHOW TABLES');
        console.log('TABLAS EN LA BASE DE DATOS:');
        tables.forEach(t => {
            console.log(`- ${Object.values(t)[0]}`);
        });

        await connection.end();
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

main();
