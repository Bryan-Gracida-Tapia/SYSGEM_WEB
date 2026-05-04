/**
 * Módulo de gestión de comuneros.
 * Depende de DB.js para centralizar conexión y autenticación HTTP.
 */
"use strict";
/**
 * Este bloque define cómo se realizan las peticiones HTTP.
 * Usa:
 * - window.SYSGEM_DB.apiFetch
 * - fetch nativo como fallback
 *
 * Incluye:
 * ✔ Timeout automático
 * ✔ Serialización JSON
 * ✔ Headers estándar
 */
const db = window.SYSGEM_DB;

/**
 * Función base para llamadas HTTP al backend.
 *
 * @param {string} endpoint - Ruta del endpoint (ej: /comuneros)
 * @param {Object} options - Configuración fetch (method, body, headers)
 * @returns {Promise<Response>}
 */
const dbApiFetch = (db && db.apiFetch)
    ? db.apiFetch.bind(db)
    : async (endpoint, options = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const headers = {
                "Content-Type": "application/json",
                ...(options.headers || {})
            };

            const config = {
                ...options,
                headers,
                signal: controller.signal
            };

            if (config.body && typeof config.body !== "string") {
                config.body = JSON.stringify(config.body);
            }

            const baseUrl = window.SYSGEM_API_BASE || "http://localhost:3000/api";

            return await fetch(`${baseUrl}${endpoint}`, config);

        } finally {
            clearTimeout(timeout);
        }
    };

/**
 * ============================================================
 * 📌 ENDPOINTS
 * ============================================================
 * Define rutas posibles para compatibilidad con backend.
 */
const ENDPOINTS = {
    dashboardCandidates: ["/dashboard/comuneros", "/comuneros"],
    createComuneroCandidates: ["/comuneros"],
    updateComuneroCandidates: (id) => [`/comuneros/${id}`],
    updateEstadoCandidates: (id) => [`/comuneros/${id}/estado`, `/comuneros/${id}`],
    bajaCandidates: (id) => [`/comuneros/${id}`, `/comuneros/${id}/baja`]
};

/**
 * ============================================================
 * 📌 ESTADO GLOBAL
 * ============================================================
 * Maneja los datos en memoria del frontend.
 */
const state = {
    comuneros: [],
    filtered: [],
    cargoFieldCount: 0,
    editingId: null
};

/**
 * ============================================================
 * 📌 INICIALIZACIÓN
 * ============================================================
 * Se ejecuta al cargar el DOM.
 */
document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    loadComuneros().catch((error) => {
        console.error(error);
        setStatusMessage("❌ Error al cargar comuneros");
    });
});

/**
 * ============================================================
 * 📌 EVENTOS UI
 * ============================================================
 * Asocia elementos HTML con eventos JS.
 */
function bindUI() {

    document.getElementById("search-comuneros")
        ?.addEventListener("input", applyFilter);

    document.getElementById("btn-open-add")
        ?.addEventListener("click", () => {
            startCreateMode();
            toggleAddSection(true);
        });

    document.getElementById("btn-cancel-add")
        ?.addEventListener("click", () => {
            resetFormState();
            toggleAddSection(false);
        });

    document.getElementById("form-add")
        ?.addEventListener("submit", submitComunero);

    document.getElementById("comuneros-list")
        ?.addEventListener("click", handleListAction);
}
/**
 * ============================
 * MOSTRAR / OCULTAR FORM
 * ============================
 */
function toggleAddSection(show) {
    const section = document.getElementById("add-section");
    if (!section) return;

    section.style.display = show ? "block" : "none";
}
/**
 * ============================================================
 * 📌 CARGA DE DATOS
 * ============================================================
 */

/**
 * Carga todos los comuneros desde backend
 */
async function loadComuneros() {
    setStatusMessage("Cargando...");

    const data = await fetchComunerosDashboard();

    state.comuneros = data.comuneros;
    state.filtered = [...data.comuneros];

    renderComunerosList(state.filtered);
    renderSummary(data.estadisticas);

    setStatusMessage(`✅ ${state.comuneros.length} comuneros cargados`);
}

/**
 * Intenta obtener comuneros desde varios endpoints
 */
async function fetchComunerosDashboard() {
    let lastError;

    for (const endpoint of ENDPOINTS.dashboardCandidates) {
        try {
            const json = await dbApiFetch(endpoint);

            return normalizeDashboardPayload(json);

        } catch (e) {
            lastError = e;
        }
    }

    throw lastError || new Error("Error obteniendo comuneros");
}

/**
 * Evita errores si JSON falla
 */
function safeJson(res) {
    return res.json().catch(() => ({}));
}

/**
 * ============================================================
 * 📌 NORMALIZACIÓN DE DATOS
 * ============================================================
 */

/**
 * Unifica estructura de respuesta del backend
 */
function normalizeDashboardPayload(payload) {
    const data = payload?.data ?? payload ?? {};
    const comunerosRaw = Array.isArray(data) ? data : ensureArray(data.comuneros);

    const comuneros = comunerosRaw.map(normalizeComunero);
    const stats = computeStats(comuneros);

    return { comuneros, estadisticas: stats };
}

/**
 * Convierte un objeto backend en modelo estándar
 */
function normalizeComunero(item = {}) {
    return {
        id: item.id ?? item._id ?? "",
        nombre: item.nombre || item.nombreCompleto || "Sin nombre",
        estado: normalizeStatus(item.estado),
        inicio: item.fechaInicio || item.createdAt,
        correo: item.correo || item.email || ""
    };
}

/**
 * ============================================================
 * 📌 ESTADÍSTICAS
 * ============================================================
 */
function computeStats(comuneros) {
    const total = comuneros.length;
    const activos = comuneros.filter(c => c.estado === "activo").length;
    const baja = comuneros.filter(c => c.estado === "baja").length;

    return {
        total,
        activos,
        inactivos: total - activos - baja,
        baja
    };
}


// ===============================
// Renderizar comuneros
// ===============================
function renderComunerosList(lista) {
    const container = document.getElementById("comuneros-list");
    const message = document.getElementById("comuneros-message");

    container.innerHTML = "";

    if (!lista || lista.length === 0) {
        container.innerHTML = `
            <div class="card__item">
                <div class="card__info">
                    <div class="card__description">No hay comuneros</div>
                </div>
            </div>
        `;
        message.textContent = "0 comuneros";
        return;
    }

    message.textContent = `✅ ${lista.length} comuneros cargados`;

    lista.forEach(c => {
        const estadoTexto = c.estado === "activo" ? "Activo" : "Inactivo";
        const estadoClase = c.estado === "activo" ? "activo" : "inactivo";

        const item = document.createElement("div");
        item.className = "card__item";

        item.innerHTML = `
            <div class="card__avatar">
                <i class="card__icon fa-solid fa-user"></i>
            </div>

            <div class="card__info">
                <div class="card__name">${c.nombre}</div>
                <div class="card__description ${estadoClase}">
                    ${estadoTexto} • Inicio: ${c.fechaInicio || "N/A"}
                </div>
            </div>

            <div class="card__actions">
                <button class="card__btn card__btn--success"
                    data-action="activate"
                    data-id="${c.id}">
                    Activar
                </button>

                <button class="card__btn card__btn--warning"
                    data-action="deactivate"
                    data-id="${c.id}">
                    Desactivar
                </button>

                <button class="card__btn card__btn--edit"
                    data-action="edit"
                    data-id="${c.id}">
                    Editar
                </button>

                <button class="card__btn card__btn--danger"
                    data-action="remove"
                    data-id="${c.id}">
                    Dar de baja
                </button>
            </div>
        `;

        container.appendChild(item);
    });
}

/**
 * Actualiza resumen
 */
function renderSummary(stats) {
    setText("summary-total", stats.total);
}

/**
 * ============================================================
 * 📌 FILTRO
 * ============================================================
 */
function applyFilter() {
    const q = document.getElementById("search-comuneros")?.value.toLowerCase() || "";

    state.filtered = state.comuneros.filter(c =>
        c.nombre.toLowerCase().includes(q)
    );

    renderComunerosList(state.filtered);
}

/**
 * ============================
 * ACCIONES (CRUD)
 * ============================
 */
async function handleListAction(e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (!id || !action) return;

    try {
        if (action === "remove") {
            const confirmDelete = confirm("¿Seguro que quieres eliminar este comunero?");
            if (!confirmDelete) return;

            await darDeBaja(id);
            setStatusMessage("🗑️ Comunero eliminado");
        }

        if (action === "edit") {
            const c = state.comuneros.find(x => x.id == id);

            if (!c) {
                setStatusMessage("❌ Comunero no encontrado");
                return;
            }

            startEditMode(c);
            return; // 🔥 evitar recarga innecesaria
        }

        // 🔥 Solo recargar si hubo cambio real
        await loadComuneros();

    } catch (err) {
        console.error(err);
        setStatusMessage(`❌ ${err.message}`);
    }
}

/**
 * Elimina comunero
 */
async function darDeBaja(id) {
    const res = await dbApiFetch(`/comuneros/${id}`, {
        method: "DELETE"
    });

    if (!res.ok) {
        const error = await safeError(res);
        throw new Error(error);
    }
}

/**
 * ============================================================
 * 📌 FORMULARIO
 * ============================================================
 */

/**
 * ============================================
 * 📌 EVENTO FORM
 * ============================================
 */
document.getElementById("form-add")
    ?.addEventListener("submit", submitComunero);

/**
 * Maneja envío de formulario
 */
async function submitComunero(e) {
    e.preventDefault();

    const payload = buildComuneroPayload();

    console.log("Payload:", payload);

    // VALIDACIÓN
    if (
        !payload.nombreCompleto ||
        !payload.fechaNacimiento ||
        !payload.estadoCivil ||
        !payload.tipo ||
        !payload.direccion ||
        !payload.correo
    ) {
        setStatusMessage("Todos los campos son obligatorios");
        return;
    }

    try {
        setStatusMessage("Guardando...");

        if (state.editingId) {
            await updateComunero(state.editingId, payload);
            setStatusMessage("Comunero actualizado");
        } else {
            await createComunero(payload);
            setStatusMessage("Comunero agregado");
        }

        resetFormState();
        await loadComuneros();

    } catch (err) {
        console.error(err);
        setStatusMessage(" Error al guardar");
    }
}

/**
 * Construye objeto a enviar
 */
function buildComuneroPayload() {
    const estadoCivil = document.querySelector('input[name="civil_status"]:checked')?.value;
    const tipo = document.querySelector('input[name="type"]:checked')?.value;
    //const password = document.getElementById("password")?.value.trim();

    const payload = {
        nombreCompleto: document.getElementById("full-name")?.value.trim(),
        fechaNacimiento: document.getElementById("birthdate")?.value,
        estadoCivil: estadoCivil,
        tipo: tipo,
        direccion: document.getElementById("address")?.value.trim(),
        correo: document.getElementById("email")?.value.trim(),
        //password: document.getElementById("password")?.value.trim()
    };
/**
    if (password) {
        payload.password = password;
    }
**/
    return payload;
}

/**
 * Crear comunero
 */
async function createComunero(payload) {
    const res = await fetch("http://localhost:3000/api/comuneros", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error creando");
    }
}

/**
 * Actualizar comunero
 */
async function updateComunero(id, payload) {
    const res = await fetch(`http://localhost:3000/api/comuneros/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error actualizando");
    }
}

/**
 * ============================================================
 * 📌 ESTADO FORMULARIO
 * ============================================================
 */
function startCreateMode() {
    state.editingId = null;
}

/**
 * Activa modo edición y llena formulario
 */
function startEditMode(c) {
    if (!c) {
        setStatusMessage("❌ Comunero no encontrado");
        return;
    }

    state.editingId = c.id;

    // usar nombre correcto
    setInputValue("full-name", c.nombreCompleto || c.nombre || "");
    setInputValue("email", c.correo || "");

    // opcional: limpiar password en edición
    setInputValue("password", "");
}

/**
 * Resetea formulario
 */
function resetFormState() {
    document.getElementById("form-add")?.reset();
    state.editingId = null;
}

/**
 * ============================================================
 * 📌 HELPERS
 * ============================================================
 */
async function safeError(res) {
    try {
        const json = await res.json();
        return json.message || JSON.stringify(json);
    } catch {
        return await res.text();
    }
}
/**
 * Muestra mensajes en UI
 */
function setStatusMessage(msg) {
    const el = document.getElementById("comuneros-message");
    if (el) el.textContent = msg;
}

/**
 * Asigna texto a elemento
 */
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

/**
 * Set input value
 */
function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
}

/**
 * Garantiza array
 */
function ensureArray(v) {
    return Array.isArray(v) ? v : [];
}

/**
 * Normaliza estado
 */
function normalizeStatus(s) {
    const v = (s || "").toLowerCase();
    if (["activo", "inactivo", "baja"].includes(v)) return v;
    return "inactivo";
}

/**
 * Previene XSS
 */
function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}