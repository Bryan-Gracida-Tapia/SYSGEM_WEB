// JavaScripts/ConsultasUsuario.js

const ConsultasUsuario = {

    // --- 1. SECCIÓN DE LOGIN ---

    // Busca un usuario por nombre para verificar si existe
    buscarPorNombre: (db, username, callback) => {
        const sql = 'SELECT nombre, password, tipo FROM usuarios WHERE nombre = ?';
        db.query(sql, [username], callback);
    },


    // --- 2. SECCIÓN DE CONSULTAS (SELECT) ---

    // Obtener todos los usuarios de la tabla
    obtenerTodos: (db, callback) => {
        const sql = 'SELECT id_usuario, nombre, tipo FROM usuarios';
        db.query(sql, callback);
    },

    // Obtener un solo usuario por su ID
    obtenerPorId: (db, id_usuario, callback) => {
        const sql = 'SELECT id_usuario, nombre, tipo FROM usuarios WHERE id_usuario = ?';
        db.query(sql, [id_usuario], callback);
    },


    // --- 3. SECCIÓN DE GESTIÓN (INSERT, UPDATE, DELETE) ---

    // Insertar un nuevo usuario (útil para registros)
    insertar: (db, datos, callback) => {
        const { nombre, password, tipo } = datos;
        const sql = 'INSERT INTO usuarios (nombre, password, tipo) VALUES (?, ?, ?)';
        db.query(sql, [nombre, password, tipo], callback);
    },

    // Actualizar datos de un usuario existente
    actualizar: (db, id_usuario, nuevosDatos, callback) => {
        const { nombre, password, tipo } = nuevosDatos;
        const sql = 'UPDATE usuarios SET nombre = ?, password = ?, tipo = ? WHERE id_usuario = ?';
        db.query(sql, [nombre, password, tipo, id_usuario], callback);
    },

    // Eliminar un usuario permanentemente
    eliminar: (db, id_usuario, callback) => {
        const sql = 'DELETE FROM usuarios WHERE id_usuario = ?';
        db.query(sql, [id_usuario], callback);
    }
};

module.exports = ConsultasUsuario;