# Volkswagen Taller Pro - Sistema de Gestión de Taller Automotriz

Volkswagen Taller Pro es una aplicación web diseñada para la gestión integral de un taller automotriz. Permite llevar un control detallado de clientes, vehículos, citas, órdenes de servicio, inventario de piezas y personal técnico. Además, incorpora módulos de análisis de datos, recomendaciones inteligentes y generación de reportes para facilitar la toma de decisiones.

## Características Principales

*   **Gestión de Clientes y Vehículos:** Registro y consulta de información detallada de clientes y sus vehículos, incluyendo historial de servicios.
*   **Programación de Citas:** Interfaz de calendario para agendar y visualizar citas de servicio.
*   **Órdenes de Servicio:** Creación, seguimiento y gestión de órdenes de trabajo, detallando servicios realizados, piezas utilizadas y costos.
*   **Gestión de Inventario:** Control de stock de repuestos y materiales, con alertas de stock bajo.
*   **Gestión de Mecánicos:** Administración del personal técnico (solo para usuarios administradores).
*   **Análisis y Recomendaciones Inteligentes:**
    *   Análisis del historial de servicios de un cliente para generar recomendaciones proactivas (ej. revisiones exhaustivas, próximos mantenimientos).
    *   (Anteriormente) Análisis de regresión lineal para costos vs kilometraje (componente React, actualmente reemplazado por recomendaciones).
    *   Componente React para comparativa de talleres (simulado).
    *   Componente React para análisis predictivo de costos con TensorFlow.js (simulado).
*   **Reportes:**
    *   Generación de reportes mensuales sobre servicios, rendimiento de mecánicos, estado de inventario y resumen de vehículos.
    *   Exportación de datos de mantenimientos generales en formatos CSV y JSON.
    *   Exportación detallada de la información de un cliente (datos personales, vehículo, historial de servicios) en formatos PDF y CSV.
    *   Exportación de Órdenes de Servicio completadas a PDF.
*   **Interfaz de Usuario:**
    *   Diseño responsivo adaptable a diferentes tamaños de pantalla.
    *   Modo claro y modo oscuro para preferencia visual del usuario.
    *   Navegación intuitiva mediante un panel lateral (sidebar).

## Funcionamiento

La aplicación está construida principalmente con tecnologías frontend: HTML, CSS (Bootstrap) y JavaScript puro. Utiliza **IndexedDB** como base de datos del lado del cliente para almacenar toda la información de manera persistente en el navegador del usuario.

*   **Almacenamiento de Datos:** Toda la información (clientes, vehículos, citas, órdenes, inventario, mecánicos, historial de mantenimientos) se guarda localmente en el navegador del usuario mediante IndexedDB. Esto permite que la aplicación funcione incluso sin conexión a internet una vez cargada, y los datos persisten entre sesiones en el mismo navegador.
*   **Lógica de Negocio:** La mayor parte de la lógica de la aplicación (CRUD de datos, cálculos, generación de recomendaciones, exportación de PDFs/CSVs) se ejecuta en el navegador a través de JavaScript.
*   **Backend (Simulado/Básico):** Se incluye un archivo `server.js` (Node.js con Express y Socket.IO) que principalmente:
    *   Sirve los archivos estáticos de la aplicación (`index.html`, `script.js`, `styles.css`).
    *   Proporciona endpoints API simulados (`/api/maintenance-data`, `/api/workshops`) y un canal Socket.IO (`request_workshop_data`) que son utilizados por algunos componentes React de análisis (actualmente más enfocados en demostración).
    *   **Importante:** El `server.js` en su estado actual **no** gestiona la persistencia principal de los datos del taller; eso lo hace IndexedDB en el cliente.

## Tecnologías Utilizadas

*   **Frontend:**
    *   HTML5
    *   CSS3 (con Bootstrap 5.3)
    *   JavaScript (ES6+)
    *   IndexedDB (para almacenamiento en el navegador)
    *   Chart.js (para gráficos)
    *   jsPDF y jsPDF-AutoTable (para generación de PDFs)
    *   PapaParse (para manejo de CSV)
    *   React y ReactDOM (para componentes de análisis avanzado, con JSX transpilado por Babel Standalone)
    *   TensorFlow.js (para el componente de análisis predictivo simulado)
*   **Backend (Básico/Simulado):**
    *   Node.js
    *   Express.js
    *   Socket.IO
    *   CORS

## Equipo de Desarrollo

*   **Project Manager:** Alberto Covarrubias Vera
*   **Diseñadora UX/UI:** Constanza Lanuza Gallardo
*   **Especialista en DevOps:** Diego Hernández Bernal
*   **Junior Developer:** Fabian Lanuza Cano

## Instalación y Ejecución Local

1.  **Clonar el repositorio (o descargar los archivos).**
2.  **Asegurarse de tener Node.js y npm instalados.**
3.  **Navegar a la carpeta del proyecto en la terminal:**
    ```bash
    cd ruta/a/la/carpeta/VolkswagenTallerPro
    ```
4.  **Instalar dependencias (opcional si solo se usa para servir archivos estáticos, pero recomendado):**
    ```bash
    npm install
    ```
5.  **Iniciar el servidor:**
    ```bash
    node server.js
    ```
    O para desarrollo con recarga automática (si tienes `nodemon` instalado globalmente o como devDependency):
    ```bash
    nodemon server.js
    ```
6.  Abrir el navegador y acceder a `http://localhost:3000`.

**Alternativa (Solo Frontend - Funcionalidad Limitada):**
Si no deseas ejecutar el servidor Node.js, puedes abrir directamente el archivo `index.html` en tu navegador. La mayoría de las funcionalidades basadas en IndexedDB funcionarán, pero las características que dependen de las API simuladas o Socket.IO (como la comparativa de talleres React) no cargarán datos del servidor.

## Próximos Pasos y Mejoras Potenciales

*   Implementar un backend completo con una base de datos persistente (MongoDB, PostgreSQL, etc.) para una solución multiusuario y centralizada.
*   Mejorar la seguridad y autenticación de usuarios.
*   Expandir la lógica de recomendaciones inteligentes.
*   Integración completa de piezas del inventario con las órdenes de servicio (descuento de stock).
*   Módulo de facturación.
*   Notificaciones y alertas avanzadas.
*   Optimización del rendimiento para grandes volúmenes de datos.
