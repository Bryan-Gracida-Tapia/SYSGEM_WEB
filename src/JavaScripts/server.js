const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const ConsultasUsuario = require('./ConsultasUsuario');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la conexión
const db = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'admin',
    database: 'cargoslachirioag'
});

db.connect(err => {
    if (err) {
        console.error('Error al conectar a MySQL:', err.message);
        return;
    }
    console.log('MySQL conectado y servidor listo');
});

// --- RUTA DE LOGIN ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    ConsultasUsuario.buscarPorNombre(db, username, (err, result) => {
        if (err) {
            console.error("Error SQL:", err.message);
            return res.status(500).json({ error: "Error en la base de datos" });
        }

        // 1. Verificar si el usuario existe
        if (result.length === 0) {
            return res.status(404).json({ message: "El usuario no existe" });
        }

        const usuarioEncontrado = result[0];

        // 2. Verificar si la contraseña es correcta
        if (usuarioEncontrado.password !== password) {
            return res.status(401).json({ message: "Contraseña incorrecta" });
        }

        // 3. Éxito
        res.json({
            mensaje: "¡Bienvenido al sistema!",
            nombre: usuarioEncontrado.nombre,
            tipo: usuarioEncontrado.tipo
        });
    });
});

app.listen(3000, () => {
    console.log('Servidor de arranque activo en http://localhost:3000');
});