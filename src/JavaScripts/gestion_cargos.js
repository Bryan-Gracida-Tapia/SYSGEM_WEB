/**
 * Módulo de gestión de cargos.
 * Depende de DB.js para centralizar conexión y autenticación HTTP.
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

// Endpoints candidatos para tolerar variaciones entre versiones del backend.
const ENDPOINTS = {
    dashboardCandidates: ["/dashboard/cargos", "/cargos/dashboard"],
    asignarCargoCandidates: ["/cargos/asignar", "/asignaciones/cargos"]
};

// Estado local mínimo de la vista para evitar depender del DOM como fuente de verdad.
const state = {
    comuneroObjetivo: null,
    cargosDisponibles: []
};

// Inicializa la vista al terminar de cargar el DOM. Si ocurre un fallo de red o parsing,
// publica un mensaje amigable en la UI y registra el error técnico en consola.
document.addEventListener("DOMContentLoaded", () => {
    initDashboard().catch((error) => {
        setStatusMessage(getErrorMessage(error, "No se pudo cargar el dashboard."));
        console.error("Error al iniciar dashboard:", error);
    });
});

/**
 * Configura los eventos principales de la pantalla y dispara la primera carga de datos.
 * Efectos: registra listeners y actualiza tarjetas/listados con información del backend.
 */
async function initDashboard() {
    attachAssignHandler();
    await loadDashboardData();
}

/**
 * -----------------------------
 * Carga y normalización de datos
 * -----------------------------
 * Orquesta el refresco total del dashboard:
 * 1) muestra estado de carga,
 * 2) obtiene datos del backend,
 * 3) renderiza lista, select y métricas,
 * 4) deja mensaje final de éxito.
 */
async function loadDashboardData() {
    setStatusMessage("Cargando dashboard...");
    const dashboard = await fetchDashboard();

    renderActiveRoles(dashboard.comunerosActivos);
    renderCargoOptions(dashboard.cargosDisponibles);
    renderStats(dashboard.estadisticas);
    renderSummary(dashboard.estadisticas);
    updateAssignmentTarget(dashboard.comuneroPendiente);

    setStatusMessage("Datos actualizados.");
}

/**
 * Consulta el dashboard de cargos intentando endpoints alternos.
 * Retorna el payload normalizado para consumo de la UI.
 * Lanza error si todos los endpoints fallan o responden no-OK.
 */
async function fetchDashboard() {
    let lastError = null;

    for (const endpoint of ENDPOINTS.dashboardCandidates) {
        try {
            const response = await dbApiFetch(endpoint, { method: "GET" });
            if (!response.ok) {
                lastError = new Error(`Error ${response.status} al consultar ${endpoint}`);
                continue;
            }

            const payload = await response.json().catch(() => ({}));
            return normalizeDashboardPayload(payload);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("No se pudo cargar la información de cargos.");
}

/**
 * Convierte respuestas heterogéneas del backend a un contrato único de frontend.
 * Acepta variantes de nombres de campos para mantener compatibilidad entre APIs.
 */
function normalizeDashboardPayload(payload) {
    const data = payload?.data || payload || {};
    const stats = data.estadisticas || data.stats || {};

    return {
        comunerosActivos: ensureArray(data.comunerosActivos || data.activeMembers || data.comuneros),
        cargosDisponibles: ensureArray(data.cargosDisponibles || data.availableCharges || data.cargos),
        comuneroPendiente: data.comuneroPendiente || data.pendingMember || data.siguienteComunero || null,
        estadisticas: {
            comunerosTotales: toNumber(stats.comunerosTotales ?? stats.totalMembers ?? data.totalComuneros),
            cargosActivos: toNumber(stats.cargosActivos ?? stats.activeCharges ?? data.totalCargosActivos),
            cargosInactivos: toNumber(stats.cargosInactivos ?? stats.inactiveCharges ?? data.totalCargosInactivos),
            serviciosActivos: toNumber(stats.serviciosActivos ?? stats.activeServices ?? data.totalServiciosActivos)
        }
    };
}

/**
 * Garantiza arreglo para iteración segura en renderizado.
 * Si el valor no es array, retorna [].
 */
function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

/**
 * Convierte a número finito para evitar NaN en estadísticas.
 * Si no puede convertirse, retorna 0.
 */
function toNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
}

/**
 * -----------------------------
 * Renderizado de interfaz
 * -----------------------------
 * Renderiza la tarjeta/lista de comuneros con cargo activo.
 * Si no hay datos, muestra estado vacío; si faltan nodos en DOM, no hace nada.
 */
function renderActiveRoles(comunerosActivos) {
    const container = document.getElementById("active-roles-list");
    if (!container) return;

    if (!comunerosActivos.length) {
        container.innerHTML = `
            <div class="person-card">
                <div class="person-card__info">
                    <div class="person-card__role">No hay cargos activos en este momento.</div>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = comunerosActivos.map((item) => {
        const nombre = escapeHtml(item.nombre || item.name || "Sin nombre");
        const cargo = escapeHtml(item.cargo || item.position || "Sin cargo");
        const inicio = escapeHtml(formatDate(item.fechaInicio || item.startDate || "Sin fecha"));

        return `
            <div class="person-card">
                <div class="person-card__avatar" aria-hidden="true">
                    <i class="person-card__icon fa-solid fa-user"></i>
                </div>
                <div class="person-card__info">
                    <div class="person-card__header">
                        <span class="person-card__name">${nombre}</span>
                        <span class="person-card__position">${cargo}</span>
                    </div>
                    <div class="person-card__role">Cargo activo desde ${inicio}</div>
                </div>
            </div>`;
    }).join("");
}

/**
 * Pinta el selector de cargos disponibles y guarda la lista en estado local.
 * También deshabilita el select cuando no hay opciones.
 */
function renderCargoOptions(cargos) {
    state.cargosDisponibles = cargos;
    const select = document.getElementById("cargo-select");
    if (!select) return;

    const optionsHtml = cargos.map((cargo) => {
        const id = escapeHtml(String(cargo.id ?? cargo._id ?? ""));
        const nombre = escapeHtml(cargo.nombre || cargo.name || "Cargo");
        return `<option value="${id}">${nombre}</option>`;
    }).join("");

    select.innerHTML = `<option value="">-- Seleccionar cargo</option>${optionsHtml}`;
    select.disabled = cargos.length === 0;
}

/**
 * Actualiza los contadores principales de estadísticas.
 */
function renderStats(stats) {
    setText("stat-comuneros-total", stats.comunerosTotales);
    setText("stat-cargos-activos", stats.cargosActivos);
    setText("stat-cargos-inactivos", stats.cargosInactivos);
}

/**
 * Actualiza el resumen lateral de métricas clave.
 */
function renderSummary(stats) {
    setText("summary-comuneros", stats.comunerosTotales);
    setText("summary-servicios-activos", stats.serviciosActivos);
    setText("summary-cargos-activos", stats.cargosActivos);
}

/**
 * Define a qué comunero se asignará el siguiente cargo.
 * Efectos: actualiza texto del botón y habilita/deshabilita según datos disponibles.
 */
function updateAssignmentTarget(comuneroPendiente) {
    state.comuneroObjetivo = comuneroPendiente;
    const button = document.getElementById("asignar-btn");
    if (!button) return;

    const nombre = comuneroPendiente?.nombre || comuneroPendiente?.name || "comunero pendiente";
    button.textContent = `Asignar a ${nombre}`;

    const hasTarget = Boolean(comuneroPendiente?.id || comuneroPendiente?._id);
    const hasCargo = state.cargosDisponibles.length > 0;
    button.disabled = !hasTarget || !hasCargo;
}

/**
 * -----------------------------
 * Eventos y acciones de usuario
 * -----------------------------
 * Registra el click de asignación de cargo.
 * Flujo: valida selección -> bloquea botón -> llama API -> refresca dashboard -> restaura estado del botón.
 */
function attachAssignHandler() {
    const button = document.getElementById("asignar-btn");
    if (!button) return;

    button.addEventListener("click", async () => {
        const select = document.getElementById("cargo-select");
        const cargoId = select?.value;
        const comuneroId = state.comuneroObjetivo?.id || state.comuneroObjetivo?._id;

        if (!cargoId) {
            setStatusMessage("Selecciona un cargo primero.");
            return;
        }

        if (!comuneroId) {
            setStatusMessage("No hay comunero pendiente para asignar.");
            return;
        }

        button.disabled = true;
        setStatusMessage("Asignando cargo...");

        try {
            const response = await assignCargo({ cargoId, comuneroId });
            const result = await response.json().catch(() => ({}));
            const backendMessage = result?.message || "Cargo asignado correctamente.";
            setStatusMessage(backendMessage);
            await loadDashboardData();
        } catch (error) {
            setStatusMessage(getErrorMessage(error, "No se pudo asignar el cargo."));
            console.error("Error al asignar cargo:", error);
        } finally {
            updateAssignmentTarget(state.comuneroObjetivo);
        }
    });
}

/**
 * Ejecuta la asignación de cargo contra endpoints alternativos.
 * Retorna la respuesta HTTP exitosa para que el caller pueda leer body/mensaje.
 */
async function assignCargo(body) {
    let lastError = null;

    for (const endpoint of ENDPOINTS.asignarCargoCandidates) {
        try {
            const response = await dbApiFetch(endpoint, {
                method: "POST",
                body
            });

            if (response.ok) return response;
            lastError = new Error(`Error ${response.status} al asignar en ${endpoint}`);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("No se pudo asignar el cargo.");
}

/**
 * -----------------------------
 * Utilidades de UI
 * -----------------------------
 * Escribe texto plano en un nodo identificado por id.
 * Si el nodo no existe, evita excepción y termina silenciosamente.
 */
function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value ?? 0);
}

/**
 * Publica mensajes de estado de operación en el módulo de ruleta/asignación.
 */
function setStatusMessage(message) {
    const node = document.getElementById("roulette-message");
    if (node) node.textContent = message;
}

// Nota: la capa HTTP/autenticación se movió a DB.js (window.SYSGEM_DB.apiFetch).

/**
 * -----------------------------
 * Utilidades de formato y seguridad
 * -----------------------------
 * Devuelve un mensaje de error legible para UI.
 * Prioriza error.message y, si no existe, usa el fallback recibido.
 */
function getErrorMessage(error, fallback) {
    const message = String(error?.message || "").trim();
    return message || fallback;
}

/**
 * Formatea fecha a locale es-MX para mostrar consistencia regional en UI.
 * Si la fecha es inválida, retorna el valor original o "Sin fecha".
 */
function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "Sin fecha");
    return date.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

/**
 * Escapa caracteres HTML para evitar inyección al renderizar texto de backend/usuario.
 */
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
