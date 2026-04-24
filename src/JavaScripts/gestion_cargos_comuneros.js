const API_BASE = window.SYSGEM_API_BASE || "http://localhost:3000/api";

const ENDPOINTS = {
    dashboardCandidates: ["/dashboard/comuneros", "/comuneros/dashboard", "/comuneros"],
    createComuneroCandidates: ["/comuneros", "/comuneros/create"],
    updateEstadoCandidates: (id) => [`/comuneros/${id}/estado`, `/comuneros/${id}`],
    bajaCandidates: (id) => [`/comuneros/${id}`, `/comuneros/${id}/baja`]
};

const state = {
    comuneros: [],
    filtered: [],
    cargoFieldCount: 0
};

document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    loadComuneros().catch((error) => {
        renderListMessage("No se pudieron cargar los comuneros.");
        console.error("Error al cargar comuneros:", error);
    });
});

function bindUI() {
    const searchInput = document.getElementById("search-comuneros");
    const openAddButton = document.getElementById("btn-open-add");
    const cancelAddButton = document.getElementById("btn-cancel-add");
    const addCargoButton = document.getElementById("btn-add-cargo");
    const formAdd = document.getElementById("form-add");
    const list = document.getElementById("comuneros-list");
    const photoInput = document.getElementById("profile-photo");
    const togglePassword = document.getElementById("toggle-password");
    const passwordInput = document.getElementById("password");

    if (searchInput) {
        searchInput.addEventListener("input", applyFilter);
    }

    if (openAddButton) {
        openAddButton.addEventListener("click", () => toggleAddSection(true));
    }

    if (cancelAddButton) {
        cancelAddButton.addEventListener("click", () => toggleAddSection(false));
    }

    if (addCargoButton) {
        addCargoButton.addEventListener("click", addCargoField);
    }

    if (formAdd) {
        formAdd.addEventListener("submit", submitComunero);
    }

    if (list) {
        list.addEventListener("click", handleListAction);
    }

    if (photoInput) {
        photoInput.addEventListener("change", () => {
            const fileName = photoInput.files?.[0]?.name || "Ningún archivo seleccionado";
            const label = document.getElementById("photo-filename");
            if (label) label.textContent = fileName;
        });
    }

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            togglePassword.textContent = isPassword ? "Ocultar" : "Mostrar";
        });
    }
}

async function loadComuneros() {
    const dashboardData = await fetchComunerosDashboard();
    state.comuneros = dashboardData.comuneros;
    state.filtered = [...state.comuneros];
    renderComunerosList(state.filtered);
    renderSummary(dashboardData.estadisticas);
}

async function fetchComunerosDashboard() {
    let lastError = null;

    for (const endpoint of ENDPOINTS.dashboardCandidates) {
        try {
            const response = await apiFetch(endpoint, { method: "GET" });
            if (!response.ok) {
                lastError = new Error(`Error ${response.status} en ${endpoint}`);
                continue;
            }

            const payload = await response.json().catch(() => ({}));
            return normalizeDashboardPayload(payload);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("No se encontraron endpoints para comuneros.");
}

function normalizeDashboardPayload(payload) {
    const data = payload?.data ?? payload ?? {};
    const comunerosRaw = Array.isArray(data)
        ? data
        : ensureArray(data.comuneros || data.members || data.items);
    const comuneros = comunerosRaw.map(normalizeComunero);

    const stats = data.estadisticas || data.stats || {};
    const computed = computeStats(comuneros);

    return {
        comuneros,
        estadisticas: {
            total: toNumber(stats.comunerosTotales ?? stats.total ?? computed.total),
            activos: toNumber(stats.comunerosActivos ?? stats.activos ?? computed.activos),
            inactivos: toNumber(stats.comunerosInactivos ?? stats.inactivos ?? computed.inactivos),
            baja: toNumber(stats.dadosDeBaja ?? stats.baja ?? computed.baja)
        }
    };
}

function normalizeComunero(item) {
    return {
        id: item.id ?? item._id ?? "",
        nombre: item.nombre || item.nombreCompleto || item.name || "Sin nombre",
        estado: (item.estado || item.status || "inactivo").toLowerCase(),
        inicio: item.fechaInicio || item.startDate || item.createdAt || "Sin fecha"
    };
}

function computeStats(comuneros) {
    const total = comuneros.length;
    const activos = comuneros.filter((c) => c.estado === "activo").length;
    const baja = comuneros.filter((c) => c.estado === "baja").length;
    const inactivos = total - activos - baja;

    return { total, activos, inactivos, baja };
}

function renderComunerosList(comuneros) {
    const list = document.getElementById("comuneros-list");
    if (!list) return;

    if (!comuneros.length) {
        renderListMessage("No hay comuneros para mostrar.");
        return;
    }

    list.innerHTML = comuneros.map((comunero) => {
        const name = escapeHtml(comunero.nombre);
        const estadoLabel = escapeHtml(capitalize(comunero.estado));
        const inicioLabel = escapeHtml(formatDate(comunero.inicio));
        const id = escapeHtml(String(comunero.id));

        return `
            <div class="card__item">
                <div class="card__avatar">
                    <i class="card__icon fa-solid fa-user"></i>
                </div>
                <div class="card__info">
                    <div class="card__name">${name}</div>
                    <div class="card__description">${estadoLabel} • Inicio: ${inicioLabel}</div>
                </div>
                <div class="card__actions">
                    <button class="card__btn card__btn--success" data-action="activate" data-id="${id}">Activar</button>
                    <button class="card__btn card__btn--warning" data-action="deactivate" data-id="${id}">Desactivar</button>
                    <button class="card__btn card__btn--edit" data-action="edit" data-id="${id}">Editar</button>
                    <button class="card__btn card__btn--danger" data-action="remove" data-id="${id}">Dar de baja</button>
                </div>
            </div>`;
    }).join("");
}

function renderSummary(stats) {
    setText("summary-total", stats.total);
    setText("summary-activos", stats.activos);
    setText("summary-inactivos", stats.inactivos);
    setText("summary-baja", stats.baja);
}

function applyFilter() {
    const query = (document.getElementById("search-comuneros")?.value || "").trim().toLowerCase();

    if (!query) {
        state.filtered = [...state.comuneros];
        renderComunerosList(state.filtered);
        return;
    }

    state.filtered = state.comuneros.filter((comunero) => {
        return comunero.nombre.toLowerCase().includes(query)
            || comunero.estado.toLowerCase().includes(query)
            || String(comunero.id).toLowerCase().includes(query);
    });

    renderComunerosList(state.filtered);
}

async function handleListAction(event) {
    const target = event.target.closest("button[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const comuneroId = target.dataset.id;
    if (!comuneroId) return;

    target.disabled = true;
    try {
        if (action === "activate") {
            await updateEstado(comuneroId, "activo");
        } else if (action === "deactivate") {
            await updateEstado(comuneroId, "inactivo");
        } else if (action === "remove") {
            await darDeBaja(comuneroId);
        } else if (action === "edit") {
            alert("Edición directa pendiente. Por ahora usa el formulario de alta.");
            return;
        }

        await loadComuneros();
    } catch (error) {
        alert("No se pudo completar la acción.");
        console.error("Error en acción de comunero:", error);
    } finally {
        target.disabled = false;
    }
}

async function updateEstado(comuneroId, estado) {
    const methods = ["PATCH", "PUT"];
    let lastError = null;

    for (const endpoint of ENDPOINTS.updateEstadoCandidates(comuneroId)) {
        for (const method of methods) {
            try {
                const response = await apiFetch(endpoint, {
                    method,
                    body: { estado }
                });

                if (response.ok) return;
                lastError = new Error(`Error ${response.status} en ${method} ${endpoint}`);
            } catch (error) {
                lastError = error;
            }
        }
    }

    throw lastError || new Error("No se pudo actualizar estado.");
}

async function darDeBaja(comuneroId) {
    let lastError = null;

    try {
        const deleteResponse = await apiFetch(ENDPOINTS.bajaCandidates(comuneroId)[0], { method: "DELETE" });
        if (deleteResponse.ok) return;
        lastError = new Error(`Error ${deleteResponse.status} al dar de baja.`);
    } catch (error) {
        lastError = error;
    }

    try {
        const fallbackResponse = await apiFetch(ENDPOINTS.bajaCandidates(comuneroId)[1], { method: "POST" });
        if (fallbackResponse.ok) return;
        lastError = new Error(`Error ${fallbackResponse.status} al dar de baja.`);
    } catch (error) {
        lastError = error;
    }

    throw lastError;
}

function toggleAddSection(show) {
    const section = document.getElementById("add-section");
    if (!section) return;

    section.hidden = !show;
    section.setAttribute("aria-hidden", show ? "false" : "true");

    if (show) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function addCargoField() {
    const container = document.getElementById("cargo-fields");
    if (!container) return;

    state.cargoFieldCount += 1;
    const rowId = `cargo-row-${state.cargoFieldCount}`;

    const row = document.createElement("div");
    row.className = "form__grid";
    row.id = rowId;
    row.innerHTML = `
        <div class="form__group">
            <label class="form__label" for="cargo-name-${state.cargoFieldCount}">Cargo</label>
            <input class="form__input cargo-name" id="cargo-name-${state.cargoFieldCount}" type="text" placeholder="Nombre del cargo" />
        </div>
        <div class="form__group">
            <label class="form__label" for="cargo-year-${state.cargoFieldCount}">Año</label>
            <input class="form__input cargo-year" id="cargo-year-${state.cargoFieldCount}" type="number" min="1900" max="2100" placeholder="2026" />
        </div>
    `;

    container.appendChild(row);
}

async function submitComunero(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = buildComuneroPayload();

    if (!payload.nombreCompleto || !payload.correo || !payload.password) {
        alert("Completa los campos obligatorios.");
        return;
    }

    const saveButton = document.getElementById("btn-save-comunero");
    if (saveButton) saveButton.disabled = true;

    try {
        await createComunero(payload);
        form.reset();
        const cargoFields = document.getElementById("cargo-fields");
        if (cargoFields) cargoFields.innerHTML = "";
        state.cargoFieldCount = 0;
        const fileLabel = document.getElementById("photo-filename");
        if (fileLabel) fileLabel.textContent = "Ningún archivo seleccionado";
        toggleAddSection(false);
        await loadComuneros();
    } catch (error) {
        alert("No se pudo guardar el comunero.");
        console.error("Error al guardar comunero:", error);
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

function buildComuneroPayload() {
    const cargoNames = Array.from(document.querySelectorAll(".cargo-name"));
    const cargoYears = Array.from(document.querySelectorAll(".cargo-year"));
    const cargosCumplidos = cargoNames.map((input, index) => {
        return {
            cargo: input.value.trim(),
            year: cargoYears[index]?.value?.trim() || ""
        };
    }).filter((item) => item.cargo);

    return {
        nombreCompleto: document.getElementById("full-name")?.value?.trim() || "",
        fechaNacimiento: document.getElementById("birthdate")?.value || "",
        estadoCivil: document.querySelector('input[name="civil_status"]:checked')?.value || "",
        tipo: document.querySelector('input[name="type"]:checked')?.value || "",
        direccion: document.getElementById("address")?.value?.trim() || "",
        correo: document.getElementById("email")?.value?.trim() || "",
        password: document.getElementById("password")?.value || "",
        cargosCumplidos
    };
}

async function createComunero(payload) {
    let lastError = null;

    for (const endpoint of ENDPOINTS.createComuneroCandidates) {
        try {
            const response = await apiFetch(endpoint, {
                method: "POST",
                body: payload
            });

            if (response.ok) return;
            lastError = new Error(`Error ${response.status} en ${endpoint}`);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("No se pudo crear el comunero.");
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

    const config = {
        ...options,
        headers
    };

    if (config.body && typeof config.body !== "string") {
        config.body = JSON.stringify(config.body);
    }

    return fetch(`${API_BASE}${endpoint}`, config);
}

function getAuthToken() {
    const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!rawUser) return "";

    try {
        const user = JSON.parse(rawUser);
        return user?.token || "";
    } catch (_error) {
        return "";
    }
}

function renderListMessage(message) {
    const list = document.getElementById("comuneros-list");
    if (!list) return;

    list.innerHTML = `
        <div class="card__item">
            <div class="card__info">
                <div class="card__description">${escapeHtml(message)}</div>
            </div>
        </div>
    `;
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value ?? 0);
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "Sin fecha");
    return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
