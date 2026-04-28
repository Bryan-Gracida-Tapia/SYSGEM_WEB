const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// conexión a MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'bryan',
    password: '1234',
    database: 'sysgem'
});

// probar conexión
db.connect(err => {
    if (err) {
        console.error('Error MySQL:', err);
        return;
    }
    console.log('MySQL conectado 🚀');
});

// endpoint de prueba
app.get('/api/test', (req, res) => {
    db.query('SELECT 1', (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});