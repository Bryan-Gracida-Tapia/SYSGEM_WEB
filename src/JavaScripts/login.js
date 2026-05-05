document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userVal = document.getElementById('input-user').value;
    const passwordVal = document.getElementById('password-login').value;

    try {
        const respuesta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userVal, password: passwordVal })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            // Guardamos los datos en localStorage para usarlos después
            localStorage.setItem('usuarioSesion', JSON.stringify(data));

            // Lógica de redirección según el tipo de usuario
            switch (data.tipo) {
                case 'admin':
                    window.location.href = "../views/gestion_cargos.html";
                    break;
                case 'secretaria':
                    window.location.href = "../views/Gestión_de_anuncios.html";
                    break;
                case 'comunero':
                    window.location.href = "../views/User_Perfil.html";
                    break;
                default:
                    window.location.href = "../views/User_Perfil.html";
                    break;
            }
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        alert("El servidor no responde.");
    }
});