📍 Directorio Libre Neuquén (LocalesNeuquen)

Directorio libre y comunitario de negocios, ferias y servicios en la ciudad de Neuquén. Hecho por vecinos, sin publicidad, sin rastreo y sin cuentas.

📖 Tabla de Contenidos

Acerca del Proyecto

Características Principales

Tecnologías Utilizadas

Puesta en Marcha Local

Estructura del Proyecto

Administración de Datos

Contribución

Licencia

🚀 Acerca del Proyecto

Directorio Libre Neuquén es una aplicación web colaborativa y de código abierto diseñada para centralizar y facilitar la búsqueda de comercios locales, ferias barriales, emprendimientos y servicios en Neuquén Capital y zonas aledañas.

El proyecto se enfoca en brindar una experiencia ágil, accesible y con privacidad absoluta para los usuarios (sin rastreadores, analíticas invasivas ni necesidad de registro previo).

✨ Características Principales

🗺️ Mapa Interactivo con Leaflet: Visualización de comercios y puntos de interés geolocalizados con indicadores de estado en tiempo real (Abierto, Cierra pronto, Cerrado).

🔍 Filtros y Búsqueda Avanzada: Búsqueda en tiempo real por palabra clave, rubro, categorías, barrios de Neuquén y disponibilidad horaria.

⭐ Favoritos Locales: Permite a los usuarios guardar sus lugares frecuentes directamente en el almacenamiento local de su navegador (localStorage).

📱 Integración con WhatsApp: Botones directos para contactar a los comercios o compartir fichas de locales de forma rápida.

🌐 Modo Offline (PWA): Soporte para instalación como Web App y funcionamiento sin conexión mediante Service Workers.

🛠️ Panel de Administración: Gestión local de comercios mediante clave hash SHA-256 para agregar, editar, exportar e importar datos mediante archivos JSON.

🛠 Tecnologías Utilizadas

El desarrollo prioritiza la simplicidad, velocidad de carga y sostenibilidad sin dependencias complejas de frameworks pesado:

Frontend Base: HTML5, CSS3 nativo (usando variables CSS y soporte para temas claro/oscuro) y JavaScript Vanilla (ESModules).

Mapas: Leaflet.js y OpenStreetMap.

Tipografías & Estilo: Tipografía serif inspirada en la paleta visual de la región ("Estepa y Río") y diseño responsivo adaptado a móviles.

⚙️ Puesta en Marcha Local

Al ser un proyecto web estático de arquitectura liviana, no requiere procesos de compilación o instalación complejos:

Clonar el repositorio:

git clone https://github.com/abeloqui/LocalesNeuquen.git
cd LocalesNeuquen


Servir la aplicación:
Puedes abrir directamente el archivo index.html en tu navegador o usar cualquier servidor HTTP local:

Con Python 3:

python3 -m http.server 8000


Con Node.js / npx:

npx serve .


Acceder:
Abre tu navegador e ingresa a http://localhost:8000.

📁 Estructura del Proyecto

LocalesNeuquen/
├── index.html        # Estructura principal y aplicación unificada
├── comercios.json    # Base de datos local/ejemplo de comercios
├── sw.js             # Service Worker para capacidades PWA y offline
├── manifest.json     # Manifiesto de la aplicación web
└── README.md         # Documentación del proyecto


📊 Administración de Datos

La aplicación puede alimentarse dinámicamente desde el archivo comercios.json o desde la configuración guardada localmente:

Ingresa al panel desde la opción Admin en la cabecera.

Introduce la contraseña de administración configurada.

Podrás agregar nuevos comercios, editar datos existentes o Exportar/Importar la base de datos en formato .json para actualizar el repositorio.

🤝 Contribución

¡Las contribuciones de la comunidad son bien recibidas! Si deseas sumar un comercio, corregir ubicaciones o mejorar la interfaz:

Haz un Fork de este repositorio.

Crea una rama con tu contribución: git checkout -b feature/nuevo-comercio

Realiza tus cambios y haz commit: git commit -m 'Añade comercio X en Barrio Centro'

Haz Push a tu rama: git push origin feature/nuevo-comercio

Abre un Pull Request.

📄 Licencia

Este proyecto está bajo la Licencia MIT - consulta el archivo de licencia para más detalles.
