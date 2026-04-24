const API_BASE = window.SYSGEM_API_BASE || "http://localhost:3000/api";

const ENDPOINTS = {
    dashboard: "/dashboard/cargos",
    asignarCargo: "/cargos/asignar"
};

const state = {
    comuneroObjetivo: null,
    cargosDisponibles: []
};

document.addEventListener("DOMContentLoaded", () => {
    initDashboard().catch((error) => {
        setStatusMessage("No se pudo cargar el dashboard.");
        console.error("Error al iniciar dashboard:", error);
    });
});

async function initDashboard() {
    attachAssignHandler();
    await loadDashboardData();
}

async function loadDashboardData() {
    const dashboard = await fetchDashboard();
    renderActiveRoles(dashboard.comunerosActivos);
    renderCargoOptions(dashboard.cargosDisponibles);
    renderStats(dashboard.estadisticas);
    renderSummary(dashboard.estadisticas);
    updateAssignmentTarget(dashboard.comuneroPendiente);
}

async function fetchDashboard() {
    const response = await apiFetch(ENDPOINTS.dashboard, { method: "GET" });
    if (!response.ok) {
        throw new Error(`Error ${response.status} al consultar ${ENDPOINTS.dashboard}`);
    }

    const payload = await response.json();
    return normalizeDashboardPayload(payload);
}

function normalizeDashboardPayload(payload) {
    const data = payload?.data || payload || {};
    const stats = data.estadisticas || data.stats || {};

    return {
        comunerosActivos: ensureArray(data.comunerosActivos || data.activeMembers),
        cargosDisponibles: ensureArray(data.cargosDisponibles || data.availableCharges),
        comuneroPendiente: data.comuneroPendiente || data.pendingMember || null,
        estadisticas: {
            comunerosTotales: toNumber(stats.comunerosTotales ?? stats.totalMembers),
            cargosActivos: toNumber(stats.cargosActivos ?? stats.activeCharges),
            cargosInactivos: toNumber(stats.cargosInactivos ?? stats.inactiveCharges),
            serviciosActivos: toNumber(stats.serviciosActivos ?? stats.activeServices)
        }
    };
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function toNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
}

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
        const inicio = escapeHtml(item.fechaInicio || item.startDate || "Sin fecha");

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
                    <div class="person-card__role">
                        Cargo activo desde ${inicio}
                    </div>
                </div>
            </div>`;
    }).join("");
}

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
}

function renderStats(stats) {
    setText("stat-comuneros-total", stats.comunerosTotales);
    setText("stat-cargos-activos", stats.cargosActivos);
    setText("stat-cargos-inactivos", stats.cargosInactivos);
}

function renderSummary(stats) {
    setText("summary-comuneros", stats.comunerosTotales);
    setText("summary-servicios-activos", stats.serviciosActivos);
    setText("summary-cargos-activos", stats.cargosActivos);
}

function updateAssignmentTarget(comuneroPendiente) {
    state.comuneroObjetivo = comuneroPendiente;
    const button = document.getElementById("asignar-btn");
    if (!button) return;

    const nombre = comuneroPendiente?.nombre || comuneroPendiente?.name || "comunero pendiente";
    button.textContent = `Asignar a ${nombre}`;
}

function attachAssignHandler() {
    const button = document.getElementById("asignar-btn");
    if (!button) return;

    button.addEventListener("click", async () => {
        const select = document.getElementById("cargo-select");
        const cargoId = select?.value;

        if (!cargoId) {
            setStatusMessage("Selecciona un cargo primero.");
            return;
        }

        if (!state.comuneroObjetivo?.id && !state.comuneroObjetivo?._id) {
            setStatusMessage("No hay comunero pendiente para asignar.");
            return;
        }

        button.disabled = true;
        setStatusMessage("Asignando cargo...");

        try {
            const response = await apiFetch(ENDPOINTS.asignarCargo, {
                method: "POST",
                body: {
                    cargoId,
                    comuneroId: state.comuneroObjetivo.id || state.comuneroObjetivo._id
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status} al asignar cargo`);
            }

            const result = await response.json().catch(() => ({}));
            const backendMessage = result?.message || "Cargo asignado correctamente.";
            setStatusMessage(backendMessage);
            await loadDashboardData();
        } catch (error) {
            setStatusMessage("No se pudo asignar el cargo.");
            console.error("Error al asignar cargo:", error);
        } finally {
            button.disabled = false;
        }
    });
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value ?? 0);
}

function setStatusMessage(message) {
    const node = document.getElementById("roulette-message");
    if (node) node.textContent = message;
}

function getAuthToken() {
    const localUser = localStorage.getItem("user");
    const sessionUser = sessionStorage.getItem("user");
    const user = localUser || sessionUser;

    if (!user) return "";

    try {
        const parsedUser = JSON.parse(user);
        return parsedUser?.token || "";
    } catch (_error) {
        return "";
    }
}

function apiFetch(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const requestConfig = {
        ...options,
        headers
    };

    if (requestConfig.body && typeof requestConfig.body !== "string") {
        requestConfig.body = JSON.stringify(requestConfig.body);
    }

    return fetch(`${API_BASE}${endpoint}`, requestConfig);
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
