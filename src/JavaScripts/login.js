/**
 * Módulo de login.
 * Usa DB.js para centralizar conexión de API y persistencia de sesión.
 */
const db = window.SYSGEM_DB;
const dbApiFetch = db?.apiFetch?.bind(db) || ((endpoint, options = {}) => {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    const config = { ...options, headers };
    if (config.body && typeof config.body !== "string") {
        config.body = JSON.stringify(config.body);
    }
    const baseUrl = window.SYSGEM_API_BASE || "http://localhost:3000/api";
    return fetch(`${baseUrl}${endpoint}`, config);
});

// Referencias a controles del formulario para evitar múltiples consultas al DOM.
const form = document.getElementById("login-form");
const userInput = document.getElementById("input-user");
const passwordInput = document.getElementById("password-login");
const toggleBtn = document.getElementById("toggle-password");
const rememberCheck = document.getElementById("remember");

// Alterna visibilidad de contraseña para mejorar UX de entrada de credenciales.
if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
        const type = passwordInput.type === "password" ? "text" : "password";
        passwordInput.type = type;

        toggleBtn.innerHTML = type === "text"
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';
    });
}

// Flujo principal de autenticación al enviar formulario de login.
if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = userInput?.value?.trim() || "";
        const password = passwordInput?.value?.trim() || "";

        if (!username || !password) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        try {
            const sessionData = await loginAgainstApi(username, password);
            saveSessionData(sessionData, Boolean(rememberCheck?.checked));
            redirectByRole(sessionData.role);
        } catch (error) {
            alert(error.message || "Usuario o contraseña incorrectos.");
        }
    });
}

// Acciones secundarias disponibles en la pantalla de login.
// Botón demo informado como no disponible para evitar falsa expectativa.
const demoButton = document.getElementById("btn-demo");
if (demoButton) {
    demoButton.addEventListener("click", () => {
        alert("Modo demo deshabilitado. Usa credenciales reales de la base de datos.");
    });
}

// Comportamiento al cargar la página: redirección automática cuando ya existe sesión.
// Si ya existe sesión guardada, redirige automáticamente según rol.
window.addEventListener("DOMContentLoaded", () => {
    const savedUser = getSavedUserData();
    if (savedUser?.role) {
        redirectByRole(savedUser.role);
    }
});

/**
 * -----------------------------
 * Capa de autenticación/API
 * -----------------------------
 * Ejecuta autenticación contra backend (/auth/login).
 * Retorna un objeto de sesión consistente con id, username, role y token.
 * Lanza error si backend rechaza credenciales o no devuelve rol.
 */
async function loginAgainstApi(username, password) {
    const response = await dbApiFetch("/auth/login", {
        method: "POST",
        auth: false,
        body: { username, password }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const backendMessage = payload?.message || "Credenciales inválidas.";
        throw new Error(backendMessage);
    }

    const user = payload.user || payload.data?.user || payload;
    const token = payload.token || payload.data?.token || "";
    const role = user.role || payload.role;

    if (!role) {
        throw new Error("La respuesta del backend no incluye rol.");
    }

    return {
        id: user.id || user._id || null,
        username: user.username || username,
        role,
        token
    };
}

/**
 * -----------------------------
 * Persistencia de sesión
 * -----------------------------
 * Guarda sesión en localStorage o sessionStorage según opción "recordarme".
 * Si remember=true persiste entre cierres de navegador.
 */
function saveSessionData(user, remember) {
    if (db?.saveSession) {
        db.saveSession(user, remember);
        return;
    }

    const serialized = JSON.stringify(user);
    if (remember) {
        localStorage.setItem("user", serialized);
        sessionStorage.removeItem("user");
    } else {
        sessionStorage.setItem("user", serialized);
        localStorage.removeItem("user");
    }
}

/**
 * Recupera usuario persistido de local/session storage.
 * Retorna null cuando no existe o no se puede parsear.
 */
function getSavedUserData() {
    if (db?.getCurrentUser) return db.getCurrentUser();

    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (_error) {
        return null;
    }
}

/**
 * -----------------------------
 * Navegación por rol
 * -----------------------------
 * Redirige al panel adecuado de acuerdo al rol del usuario autenticado.
 * Muestra alerta si el rol no está mapeado.
 */
function redirectByRole(role) {
    const routes = {
        admin: "../views/gestion_cargos.html",
        secretaria: "../views/gestion_cargos_comuneros.html",
        comunero: "../views/gestion_cargos_comuneros.html"
    };

    const target = routes[role];
    if (!target) {
        alert("Rol no reconocido.");
        return;
    }

    window.location.href = target;
}
