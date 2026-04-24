function getCurrentUser() {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (_error) {
        return null;
    }
}

function initLogout() {
    const logoutButton = document.getElementById("btn-logout");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        window.location.href = "../../index.html";
    });
}

function renderUser() {
    const title = document.querySelector(".topnav__title");
    const user = getCurrentUser();
    if (!title || !user?.username) return;

    title.textContent = `Panel de control - ${user.username}`;
}

window.getCurrentUser = getCurrentUser;
window.initLogout = initLogout;
window.renderUser = renderUser;
