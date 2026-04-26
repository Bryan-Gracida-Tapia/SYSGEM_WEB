/**
 * Lee el usuario autenticado desde almacenamiento local o de sesión.
 * Retorna objeto usuario parseado o null si no existe/está corrupto.
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
 * Vincula la lógica de cerrar sesión al botón #btn-logout.
 * Efectos: limpia storage y redirige al login principal.
 */
function initLogout() {
    const logoutButton = document.getElementById("btn-logout");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        window.location.href = "../../index.html";
    });
}

/**
 * Escribe en el header el nombre de usuario logueado.
 * No modifica nada si el título o el usuario no están disponibles.
 */
function renderUser() {
    const title = document.querySelector(".topnav__title");
    const user = getCurrentUser();
    if (!title || !user?.username) return;

    title.textContent = `Panel de control - ${user.username}`;
}

// Expone utilidades globales para usarse desde scripts inline de las vistas.
window.getCurrentUser = getCurrentUser;
window.initLogout = initLogout;
window.renderUser = renderUser;
