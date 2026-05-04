# SYSGEM_WEB

Aplicación web desarrollada con el objetivo de facilitar la gestión de datos dentro de una comunidad, especialmente enfocada en la administración de cargos, anuncios y perfiles de usuario.

---

## Características

- 🔐 Sistema de login de usuarios  
- 👤 Gestión de perfiles  
- 📢 Publicación y administración de anuncios  
- 🏛️ Gestión de cargos comuneros  
- 🧩 Componentes reutilizables (header, footer)  
- 🎨 Interfaz organizada con HTML, CSS y JavaScript  

---

## 📁 Estructura del proyecto

```
SYSGEM_WEB/
│
├── public/
│   └── assets/
│       └── logo.png
│
├── src/
│   ├── components/
│   │   ├── footer.html
│   │   ├── header_panel_de_anuncios.html
│   │   ├── header_panel_de_control.html
│   │   └── header_profile.html
│   │
│   ├── interfaces/
│   │   ├── Gestion_cargos.html
│   │   ├── Gestion_cargos_comuneros.html
│   │   ├── Gestión_de_anuncios.html
│   │   ├── Login.html
│   │   └── User_Perfil.html
│   │
│   ├── Javascripts/
│   │   ├── gestion_cargos.js
│   │   ├── global.js
│   │   └── login.js
│   │
│   └── styles/
│       └── style.css
│
├── structure.html
├── index.html
└── README.md
```
---

## Tecnologías utilizadas

- HTML5  
- CSS3  
- JavaScript (Vanilla JS)  

---
## Funcionalidades principales
### Login

Permite el acceso de usuarios mediante credenciales.

### Perfil de usuario

Visualización y gestión de información personal.

### Gestión de anuncios

Creación, edición y visualización de anuncios dentro de la comunidad.

### Gestión de cargos

Administración de roles o cargos dentro del sistema.

## Estado del proyecto

### En desarrollo
Actualmente se encuentra en mejora continua, incluyendo integración futura de backend.

## Autores

Bryan Gracida Tapia y Galilea Peralta Contreras

Desarrollo del frontend
Diseño de estructura del sistema

## Notas
Este proyecto fue desarrollado como parte de prácticas académicas.
Algunas funcionalidades pueden estar incompletas o en proceso de mejora.

---

## 🔌 Conexión API centralizada

Se agregó el archivo `src/JavaScripts/DB.js` para centralizar la conexión del frontend con la API:

- Configuración de URL base (`SYSGEM_API_BASE`)
- Lectura y limpieza de sesión (`localStorage` / `sessionStorage`)
- Obtención de token para autenticación Bearer
- Wrapper `apiFetch()` con serialización JSON automática

Esto reduce código repetido en `login.js`, `gestion_cargos.js` y `gestion_cargos_comuneros.js`.

## 🗄️ Configuración de conexión MySQL (backend local)

El servidor de prueba está en `src/JavaScripts/server.js` y ahora usa variables de entorno.

1. Crea `.env` tomando como base `.env.example`.
2. Ajusta tus credenciales reales:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
3. Instala dependencias:
   - `npm install`
4. Inicia el API:
   - `npm run start:api`

Endpoint de prueba:
- `GET http://localhost:3000/api/test`
