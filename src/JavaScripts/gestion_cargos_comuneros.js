const API_BASE = window.SYSGEM_API_BASE || "http://localhost:3000/api";

const ENDPOINTS = {
    dashboardCandidates: ["/dashboard/comuneros", "/comuneros/dashboard", "/comuneros"],
    createComuneroCandidates: ["/comuneros", "/comuneros/create"],
    updateComuneroCandidates: (id) => [`/comuneros/${id}`],
    updateEstadoCandidates: (id) => [`/comuneros/${id}/estado`, `/comuneros/${id}`],
    bajaCandidates: (id) => [`/comuneros/${id}`, `/comuneros/${id}/baja`]
};

const state = {
    comuneros: [],
    filtered: [],
    cargoFieldCount: 0,
    editingId: null
};

// Arranque principal de pantalla: registra eventos y carga información inicial.
document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    loadComuneros().catch((error) => {
        renderListMessage("No se pudieron cargar los comuneros.");
        setStatusMessage(getErrorMessage(error, "Error al cargar comuneros."));
        console.error("Error al cargar comuneros:", error);
    });
});

/**
 * Vincula los elementos del DOM con su comportamiento dinámico.
 * Efectos: listeners para búsqueda, alta, edición, acciones de fila, imagen y visibilidad de contraseña.
 */
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

    if (searchInput) searchInput.addEventListener("input", applyFilter);
    if (openAddButton) {
        openAddButton.addEventListener("click", () => {
            startCreateMode();
            toggleAddSection(true);
        });
    }

    if (cancelAddButton) {
        cancelAddButton.addEventListener("click", () => {
            resetFormState();
            toggleAddSection(false);
        });
    }

    if (addCargoButton) addCargoButton.addEventListener("click", addCargoField);
    if (formAdd) formAdd.addEventListener("submit", submitComunero);
    if (list) list.addEventListener("click", handleListAction);

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

/**
 * Refresca la fuente de datos principal de comuneros.
 * Efectos: cambia mensaje de estado, sincroniza state.comuneros/state.filtered y rerenderiza lista + resumen.
 */
async function loadComuneros() {
    setStatusMessage("Cargando comuneros...");
    const dashboardData = await fetchComunerosDashboard();

    state.comuneros = dashboardData.comuneros;
    state.filtered = [...state.comuneros];

    renderComunerosList(state.filtered);
    renderSummary(dashboardData.estadisticas);
    setStatusMessage(`Se cargaron ${state.comuneros.length} comuneros.`);
}

/**
 * Consulta la data de comuneros intentando varios endpoints compatibles.
 * Devuelve datos normalizados para evitar condicionales en capas de render.
 */
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

/**
 * Unifica la respuesta del backend en:
 * - array de comuneros homogenizado
 * - estadísticas precomputadas o tomadas de backend
 */
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

/**
 * Mapea un comunero del backend a un modelo interno estable.
 * Incluye fallback de nombres de campos y normalización de estado.
 */
function normalizeComunero(item) {
    return {
        id: item.id ?? item._id ?? "",
        nombre: item.nombre || item.nombreCompleto || item.name || "Sin nombre",
        estado: normalizeStatus(item.estado || item.status || "inactivo"),
        inicio: item.fechaInicio || item.startDate || item.createdAt || "Sin fecha",
        fechaNacimiento: item.fechaNacimiento || item.birthdate || "",
        estadoCivil: item.estadoCivil || item.civilStatus || "",
        tipo: item.tipo || item.type || "",
        direccion: item.direccion || item.address || "",
        correo: item.correo || item.email || ""
    };
}

/**
 * Calcula estadísticas locales por estado de comunero.
 * Retorna total, activos, inactivos y baja.
 */
function computeStats(comuneros) {
    const total = comuneros.length;
    const activos = comuneros.filter((c) => c.estado === "activo").length;
    const baja = comuneros.filter((c) => c.estado === "baja").length;
    const inactivos = total - activos - baja;

    return { total, activos, inactivos, baja };
}

/**
 * Renderiza el listado de comuneros con botones de acción por fila.
 * Si no hay datos, muestra tarjeta de estado vacío.
 */
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

/**
 * Actualiza el resumen lateral con conteos globales.
 */
function renderSummary(stats) {
    setText("summary-total", stats.total);
    setText("summary-activos", stats.activos);
    setText("summary-inactivos", stats.inactivos);
    setText("summary-baja", stats.baja);
}

/**
 * Filtra el listado actual por nombre, estado o id.
 * Efectos: reemplaza state.filtered, rerenderiza y reporta total de resultados.
 */
function applyFilter() {
    const query = (document.getElementById("search-comuneros")?.value || "").trim().toLowerCase();

    if (!query) {
        state.filtered = [...state.comuneros];
        renderComunerosList(state.filtered);
        setStatusMessage(`Mostrando ${state.filtered.length} comuneros.`);
        return;
    }

    state.filtered = state.comuneros.filter((comunero) => {
        return comunero.nombre.toLowerCase().includes(query)
            || comunero.estado.toLowerCase().includes(query)
            || String(comunero.id).toLowerCase().includes(query);
    });

    renderComunerosList(state.filtered);
    setStatusMessage(`Resultado de búsqueda: ${state.filtered.length} comuneros.`);
}

/**
 * Controlador central de acciones por fila (event delegation).
 * Administra activar/desactivar/baja/edición y refresca datos al finalizar.
 */
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
            setStatusMessage("Comunero activado correctamente.");
        } else if (action === "deactivate") {
            await updateEstado(comuneroId, "inactivo");
            setStatusMessage("Comunero desactivado correctamente.");
        } else if (action === "remove") {
            const confirmed = window.confirm("¿Seguro que deseas dar de baja este comunero?");
            if (!confirmed) return;
            await darDeBaja(comuneroId);
            setStatusMessage("Comunero dado de baja correctamente.");
        } else if (action === "edit") {
            const comunero = state.comuneros.find((item) => String(item.id) === String(comuneroId));
            if (!comunero) {
                setStatusMessage("No se encontró el comunero para edición.");
                return;
            }

            startEditMode(comunero);
            toggleAddSection(true);
            setStatusMessage(`Editando a ${comunero.nombre}.`);
            return;
        }

        await loadComuneros();
    } catch (error) {
        setStatusMessage(getErrorMessage(error, "No se pudo completar la acción."));
        console.error("Error en acción de comunero:", error);
    } finally {
        target.disabled = false;
    }
}

/**
 * Actualiza el estado de un comunero (activo/inactivo) probando PATCH y PUT.
 * Se detiene en el primer éxito, o lanza error consolidado.
 */
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

/**
 * Ejecuta baja lógica/física de comunero usando DELETE y endpoint fallback.
 */
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

/**
 * Muestra u oculta el formulario de alta/edición.
 * Efectos: toggles de hidden/aria-hidden y scroll automático al abrir.
 */
function toggleAddSection(show) {
    const section = document.getElementById("add-section");
    if (!section) return;

    section.hidden = !show;
    section.setAttribute("aria-hidden", show ? "false" : "true");

    if (show) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

/**
 * Inserta dinámicamente una fila de cargo cumplido en el formulario.
 * Usa contador incremental para ids únicos de inputs.
 */
function addCargoField(cargo = "", year = "") {
    const container = document.getElementById("cargo-fields");
    if (!container) return;

    state.cargoFieldCount += 1;

    const row = document.createElement("div");
    row.className = "form__grid";
    row.innerHTML = `
        <div class="form__group">
            <label class="form__label" for="cargo-name-${state.cargoFieldCount}">Cargo</label>
            <input class="form__input cargo-name" id="cargo-name-${state.cargoFieldCount}" type="text" placeholder="Nombre del cargo" value="${escapeHtml(cargo)}" />
        </div>
        <div class="form__group">
            <label class="form__label" for="cargo-year-${state.cargoFieldCount}">Año</label>
            <input class="form__input cargo-year" id="cargo-year-${state.cargoFieldCount}" type="number" min="1900" max="2100" placeholder="2026" value="${escapeHtml(String(year || ""))}" />
        </div>
    `;

    container.appendChild(row);
}

/**
 * Maneja submit del formulario para crear o editar comunero.
 * Valida campos mínimos, bloquea botón durante la llamada y refresca el listado al terminar.
 */
async function submitComunero(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = buildComuneroPayload();

    if (!payload.nombreCompleto || !payload.correo || (!state.editingId && !payload.password)) {
        setStatusMessage("Completa los campos obligatorios.");
        return;
    }

    const saveButton = document.getElementById("btn-save-comunero");
    if (saveButton) saveButton.disabled = true;

    try {
        if (state.editingId) {
            await updateComunero(state.editingId, payload);
            setStatusMessage("Comunero actualizado correctamente.");
        } else {
            await createComunero(payload);
            setStatusMessage("Comunero creado correctamente.");
        }

        form.reset();
        clearCargoFields();
        resetFormState();
        toggleAddSection(false);
        await loadComuneros();
    } catch (error) {
        setStatusMessage(getErrorMessage(error, "No se pudo guardar el comunero."));
        console.error("Error al guardar comunero:", error);
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

/**
 * Construye el payload de alta/edición leyendo todos los campos del formulario.
 * Elimina password en modo edición cuando no se envía una nueva contraseña.
 */
function buildComuneroPayload() {
    const cargoNames = Array.from(document.querySelectorAll(".cargo-name"));
    const cargoYears = Array.from(document.querySelectorAll(".cargo-year"));

    const cargosCumplidos = cargoNames.map((input, index) => {
        return {
            cargo: input.value.trim(),
            year: cargoYears[index]?.value?.trim() || ""
        };
    }).filter((item) => item.cargo);

    const payload = {
        nombreCompleto: document.getElementById("full-name")?.value?.trim() || "",
        fechaNacimiento: document.getElementById("birthdate")?.value || "",
        estadoCivil: document.querySelector('input[name="civil_status"]:checked')?.value || "",
        tipo: document.querySelector('input[name="type"]:checked')?.value || "",
        direccion: document.getElementById("address")?.value?.trim() || "",
        correo: document.getElementById("email")?.value?.trim() || "",
        password: document.getElementById("password")?.value || "",
        cargosCumplidos
    };

    if (state.editingId && !payload.password) {
        delete payload.password;
    }

    return payload;
}

/**
 * Crea un comunero nuevo en backend probando endpoints de compatibilidad.
 */
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

/**
 * Actualiza un comunero existente usando PATCH/PUT sobre endpoint principal.
 */
async function updateComunero(comuneroId, payload) {
    const methods = ["PATCH", "PUT"];
    let lastError = null;

    for (const endpoint of ENDPOINTS.updateComuneroCandidates(comuneroId)) {
        for (const method of methods) {
            try {
                const response = await apiFetch(endpoint, {
                    method,
                    body: payload
                });

                if (response.ok) return;
                lastError = new Error(`Error ${response.status} en ${method} ${endpoint}`);
            } catch (error) {
                lastError = error;
            }
        }
    }

    throw lastError || new Error("No se pudo actualizar el comunero.");
}

/**
 * Deja el formulario en modo "crear": limpia edición activa y textos de UI.
 */
function startCreateMode() {
    state.editingId = null;
    const saveButton = document.getElementById("btn-save-comunero");
    if (saveButton) saveButton.textContent = "Guardar Comunero";

    const formTitle = document.querySelector("#add-section .card__title");
    if (formTitle) formTitle.textContent = "Agregar Nuevo Comunero";
}

/**
 * Configura el formulario en modo "editar" y precarga datos del comunero seleccionado.
 */
function startEditMode(comunero) {
    state.editingId = comunero.id;

    const saveButton = document.getElementById("btn-save-comunero");
    if (saveButton) saveButton.textContent = "Actualizar Comunero";

    const formTitle = document.querySelector("#add-section .card__title");
    if (formTitle) formTitle.textContent = "Editar Comunero";

    setInputValue("full-name", comunero.nombre);
    setInputValue("birthdate", comunero.fechaNacimiento);
    setInputValue("address", comunero.direccion);
    setInputValue("email", comunero.correo);
    setInputValue("password", "");

    setCheckedRadio("civil_status", comunero.estadoCivil);
    setCheckedRadio("type", comunero.tipo);

    clearCargoFields();
}

/**
 * Restablece completamente el formulario y estado interno de edición.
 */
function resetFormState() {
    state.editingId = null;
    const form = document.getElementById("form-add");
    if (form) form.reset();

    clearCargoFields();
    const fileLabel = document.getElementById("photo-filename");
    if (fileLabel) fileLabel.textContent = "Ningún archivo seleccionado";

    startCreateMode();
}

/**
 * Elimina todas las filas dinámicas de cargos y reinicia contador interno.
 */
function clearCargoFields() {
    const cargoFields = document.getElementById("cargo-fields");
    if (cargoFields) cargoFields.innerHTML = "";
    state.cargoFieldCount = 0;
}

/**
 * Asigna valor a un input del formulario por id.
 */
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value || "";
}

/**
 * Marca la opción de radio correspondiente dentro de un grupo por nombre.
 */
function setCheckedRadio(groupName, value) {
    const radios = Array.from(document.querySelectorAll(`input[name="${groupName}"]`));
    radios.forEach((radio) => {
        radio.checked = radio.value === (value || "");
    });
}

/**
 * Muestra mensajes de estado operativos en la vista de comuneros.
 */
function setStatusMessage(message) {
    const node = document.getElementById("comuneros-message");
    if (node) node.textContent = String(message || "");
}

/**
 * Envoltura de fetch con base URL, headers JSON, token Bearer y serialización de body.
 */
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

/**
 * Recupera token desde localStorage/sessionStorage para autenticación de API.
 */
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

/**
 * Renderiza un mensaje informativo simple en la lista cuando no hay filas útiles.
 */
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

/**
 * Escribe un valor textual en un elemento por id.
 */
function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value ?? 0);
}

/**
 * Normaliza entrada a arreglo para operaciones de mapeo/filtrado seguras.
 */
function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

/**
 * Convierte un valor cualquiera a número válido, devolviendo 0 en fallo.
 */
function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Capitaliza la primera letra de una cadena para etiquetas visibles.
 */
function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Homologa estados equivalentes para mantener filtros y conteos consistentes.
 */
function normalizeStatus(value) {
    const status = String(value || "inactivo").trim().toLowerCase();
    if (["activo", "inactivo", "baja"].includes(status)) return status;
    if (status === "activa") return "activo";
    if (status === "inactiva") return "inactivo";
    return "inactivo";
}

/**
 * Formatea fecha a es-MX; conserva valor original si es inválida.
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
 * Obtiene mensaje de error legible para interfaz.
 */
function getErrorMessage(error, fallback) {
    const message = String(error?.message || "").trim();
    return message || fallback;
}

/**
 * Escapa caracteres especiales HTML para prevenir XSS al usar innerHTML.
 */
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
