"use strict";
// posman para verifica el backend,
/**
 * ============================================
 * 📌 IMPORTACIONES
 * ============================================
 */
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

/**
 * ============================================
 * 📌 MIDDLEWARE
 * ============================================
 */
app.use(cors());
app.use(express.json());

/**
 * ============================================
 * 📌 CONEXIÓN A MYSQL
 * ============================================
 */
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

/**
 * Verifica conexión
 */
(async () => {
    try {
        await db.query("SELECT 1");
        console.log(" Conectado a MySQL");
    } catch (err) {
        console.error("Error MySQL:", err.message);
    }
})();

/**
 * ============================================
 * 📌 HELPERS
 * ============================================
 */
function mapComunero(row) {
    return {
        id: row.id,
        nombre: row.nombre_completo,
        nombreCompleto: row.nombre_completo,
        fechaNacimiento: row.fecha_nacimiento,
        estadoCivil: row.estado_civil,
        tipo: row.tipo,
        direccion: row.direccion,
        correo: row.correo,
        estado: row.estado,
        fechaInicio: row.fecha_inicio
    };
}

/**
 * ============================================
 * 📌 ENDPOINTS
 * ============================================
 */

/**
 * Obtener todos los comuneros
 */
app.get("/api/comuneros", async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM comuneros`);
        res.json({ comuneros: rows.map(mapComunero) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Crear comunero
 */
app.post("/api/comuneros", async (req, res) => {
    try {
        console.log("BODY RECIBIDO:", req.body);
        const {
            nombreCompleto,
            fechaNacimiento,
            estadoCivil,
            tipo,
            direccion,
            correo
        } = req.body;

        const [result] = await db.query("INSERT INTO comuneros (nombre_completo, fecha_nacimiento, estado_civil, tipo, direccion, correo, estado,fecha_inicio) VALUES (?, ?, ?, ?, ?, ?, 'activo',NOW())", [nombreCompleto, fechaNacimiento, estadoCivil, tipo, direccion, correo]);

        res.json({ id: result.insertId });

    } catch (err) {
        console.error("ERROR SQL:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Actualizar comunero
 */
app.put("/api/comuneros/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombreCompleto,
            direccion,
            correo
        } = req.body;

        await db.query(" UPDATE comuneros SET nombre_completo = ?, direccion = ?, correo = ? WHERE id = ?", [nombreCompleto, direccion, correo, id]);

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Eliminar comunero
 */
app.delete("/api/comuneros/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.query("DELETE FROM comuneros WHERE id = ?", [id]);

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Cambiar estado
 */
app.patch("/api/comuneros/:id/estado", async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        await db.query(" UPDATE comuneros SET estado = ? WHERE id = ?", [estado, id]);

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * ============================================
 * 🚀 SERVIDOR
 * ============================================
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
});
