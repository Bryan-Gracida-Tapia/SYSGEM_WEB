/**
 * ============================================
 * DB.js - Capa central de conexión a la API
 * ============================================
 * - Manejo de sesión
 * - Token Bearer
 * - Fetch con manejo de errores
 */

(function initSysgemDb(globalObject) {
    const DEFAULT_API_BASE = `${window.location.origin}/api`;

    function getApiBase() {
        return globalObject.SYSGEM_API_BASE || DEFAULT_API_BASE;
    }

    function getCurrentUser() {
        const raw =
            localStorage.getItem("user") ||
            sessionStorage.getItem("user");

        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch {
            clearSession();
            return null;
        }
    }

    function getAuthToken() {
        return getCurrentUser()?.token || "";
    }

    function saveSession(user, remember = false) {
        const data = JSON.stringify(user);

        if (remember) {
            localStorage.setItem("user", data);
            sessionStorage.removeItem("user");
        } else {
            sessionStorage.setItem("user", data);
            localStorage.removeItem("user");
        }
    }

    function clearSession() {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
    }

    function buildUrl(endpoint) {
        if (/^https?:\/\//i.test(endpoint)) return endpoint;
        return `${getApiBase()}${endpoint}`;
    }

    async function apiFetch(endpoint, options = {}) {
        const { auth = true, ...opts } = options;

        const headers = {
            "Content-Type": "application/json",
            ...(opts.headers || {})
        };

        if (auth) {
            const token = getAuthToken();
            if (token) headers.Authorization = `Bearer ${token}`;
        }

        const config = { ...opts, headers };

        if (config.body && typeof config.body !== "string") {
            config.body = JSON.stringify(config.body);
        }

        const res = await fetch(buildUrl(endpoint), config);

        if (!res.ok) {
            let error = {};
            try {
                error = await res.json();
            } catch {}
            throw new Error(error.message || `Error HTTP ${res.status}`);
        }

        return res.json();
    }

    globalObject.SYSGEM_DB = {
        getApiBase,
        getCurrentUser,
        getAuthToken,
        saveSession,
        clearSession,
        apiFetch
    };
})(window);