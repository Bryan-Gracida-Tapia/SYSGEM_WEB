const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

const dbConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "admin_sysgem",
    password: process.env.DB_PASSWORD || "Admin_46825!",
    database: process.env.DB_NAME || "sysgem",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0
};

if (!dbConfig.user) {
    console.error("DB_USER no esta configurado.");
    process.exit(1);
}

const db = mysql.createPool(dbConfig);

async function verifyDatabaseConnection() {
    try {
        await db.query("SELECT 1");
        console.log("MySQL conectado.");
    } catch (error) {
        console.error("No se pudo conectar a MySQL.");
        console.error("Config:", {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            database: dbConfig.database
        });
        console.error("Detalle:", error.message);
        process.exit(1);
    }
}

app.get("/api/test", async (_req, res) => {
    try {
        const [result] = await db.query("SELECT 1 AS ok");
        res.json(result);
    } catch (error) {
        res.status(500).json({
            message: "Error de base de datos.",
            detail: error.message
        });
    }
});

async function startServer() {
    await verifyDatabaseConnection();
    app.listen(PORT, () => {
        console.log(`Servidor en http://localhost:${PORT}`);
    });
}

startServer();
