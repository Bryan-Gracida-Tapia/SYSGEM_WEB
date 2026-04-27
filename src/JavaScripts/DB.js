/**
 * ============================================
 * DB.js - Capa central de conexión a la API
 * ============================================
 * Este módulo evita duplicar lógica de conexión en cada archivo JS.
 *
 * Funciones principales:
 * - getApiBase(): obtiene URL base de API.
 * - getCurrentUser(): recupera usuario de local/session storage.
 * - getAuthToken(): obtiene token Bearer de la sesión actual.
 * - saveSession(user, remember): guarda sesión persistente o temporal.
 * - clearSession(): limpia sesión local y de navegador.
 * - apiFetch(endpoint, options): wrapper de fetch con base URL, JSON y auth.
 */
(function initSysgemDb(globalObject) {
    const DEFAULT_API_BASE = "http://localhost:3000/api";

    /**
     * Retorna la URL base de API definida en ventana o la predeterminada.
     */
    function getApiBase() {
        return globalObject.SYSGEM_API_BASE || DEFAULT_API_BASE;
    }

    /**
     * Lee la sesión guardada desde localStorage o sessionStorage.
     * Retorna objeto usuario o null cuando no existe/corrupto.
     */
    function getCurrentUser() {
        const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch (_error) {
            return null;
        }
    }

    /**
     * Retorna el token de autenticación actual o string vacío.
     */
    function getAuthToken() {
        return getCurrentUser()?.token || "";
    }

    /**
     * Persiste la sesión en localStorage (remember=true) o sessionStorage.
     */
    function saveSession(user, remember) {
        const serialized = JSON.stringify(user);

        if (remember) {
            localStorage.setItem("user", serialized);
            sessionStorage.removeItem("user");
            return;
        }

        sessionStorage.setItem("user", serialized);
        localStorage.removeItem("user");
    }

    /**
     * Elimina cualquier sesión almacenada.
     */
    function clearSession() {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
    }

    /**
     * Crea URL final a partir de endpoint relativo o absoluto.
     */
    function buildUrl(endpoint) {
        if (/^https?:\/\//i.test(endpoint)) return endpoint;
        return `${getApiBase()}${endpoint}`;
    }

    /**
     * Wrapper de fetch para API:
     * - agrega `Content-Type: application/json` por defecto,
     * - agrega `Authorization: Bearer <token>` cuando auth=true y existe token,
     * - serializa body object a JSON automáticamente.
     */
    function apiFetch(endpoint, options = {}) {
        const { auth = true, ...requestOptions } = options;
        const headers = {
            "Content-Type": "application/json",
            ...(requestOptions.headers || {})
        };

        if (auth) {
            const token = getAuthToken();
            if (token) headers.Authorization = `Bearer ${token}`;
        }

        const config = {
            ...requestOptions,
            headers
        };

        if (config.body && typeof config.body !== "string") {
            config.body = JSON.stringify(config.body);
        }

        return fetch(buildUrl(endpoint), config);
    }

    // API pública del módulo de conexión.
    globalObject.SYSGEM_DB = {
        getApiBase,
        getCurrentUser,
        getAuthToken,
        saveSession,
        clearSession,
        apiFetch
    };
})(window);
