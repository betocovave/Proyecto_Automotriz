// Configuración inicial
let db;
let currentUser = null;

// Configuración de Socket.IO
const socket = io(); // Assumes server is on the same host/port, or configure URL if needed

// Inicialización de la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.error("Tu navegador no soporta IndexedDB");
            reject("Tu navegador no soporta IndexedDB");
            return;
        }

        const request = indexedDB.open('AutomotrizDB', 5); // Incremented version to update schema

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos:', event.target.error);
            reject(event.target.error);
        };

        request.onblocked = (event) => {
            console.warn('La base de datos está bloqueada. Por favor, cierre otras pestañas con esta aplicación.');
            alert("La base de datos necesita actualizarse, pero está bloqueada. Por favor, cierre otras pestañas con esta aplicación y recargue la página.");
        };

        request.onupgradeneeded = (event) => {
            console.log('Actualizando la base de datos...');
            db = event.target.result;
            const transaction = event.target.transaction; // Get transaction for schema changes

            // Crear almacén de citas si no existe
            if (!db.objectStoreNames.contains('citas')) {
                const citasStore = db.createObjectStore('citas', { keyPath: 'id', autoIncrement: true });
                citasStore.createIndex('fecha', 'fecha', { unique: false });
                citasStore.createIndex('clienteId', 'clienteId', { unique: false });
                citasStore.createIndex('status', 'status', { unique: false });
                console.log("Object store 'citas' created.");
            }

            // Crear almacén de inventario si no existe
            if (!db.objectStoreNames.contains('inventario')) {
                const inventarioStore = db.createObjectStore('inventario', { keyPath: 'id', autoIncrement: true });
                inventarioStore.createIndex('categoria', 'category', { unique: false }); // Corrected index name
                inventarioStore.createIndex('proveedor', 'supplier', { unique: false }); // Corrected index name
                inventarioStore.createIndex('code', 'code', { unique: true }); // Added index for code
                console.log("Object store 'inventario' created.");
            }

            // Crear o actualizar almacén de clientes
            let clientesStore;
            if (db.objectStoreNames.contains('clientes')) {
                 // If it exists, ensure indices are correct (might need deletion/recreation if signature changes)
                 // For simplicity here, we just get the existing store if indices don't need fundamental changes
                 clientesStore = transaction.objectStore('clientes');
                 console.log("Object store 'clientes' found.");
            } else {
                clientesStore = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
                console.log("Object store 'clientes' created.");
            }
            // Ensure indices exist
            if (!clientesStore.indexNames.contains('nombre')) {
                clientesStore.createIndex('nombre', 'nombre', { unique: false });
                 console.log("Index 'nombre' created on 'clientes'.");
            }
            if (!clientesStore.indexNames.contains('placa')) { // Add index for placa search
                 clientesStore.createIndex('placa', 'placa', { unique: false }); // Placa might not be unique
                 console.log("Index 'placa' created on 'clientes'.");
            }


            // Crear almacén de mecánicos si no existe
            if (!db.objectStoreNames.contains('mecanicos')) {
                const mecanicosStore = db.createObjectStore('mecanicos', { keyPath: 'id', autoIncrement: true });
                mecanicosStore.createIndex('usuario', 'usuario', { unique: true });
                console.log("Object store 'mecanicos' created.");
            }

            // Crear almacén de mantenimientos si no existe
            if (!db.objectStoreNames.contains('mantenimientos')) {
                const mantenimientosStore = db.createObjectStore('mantenimientos', { keyPath: 'id', autoIncrement: true });
                mantenimientosStore.createIndex('fecha', 'fecha', { unique: false });
                mantenimientosStore.createIndex('tipo', 'tipo', { unique: false });
                mantenimientosStore.createIndex('clienteId', 'clienteId', { unique: false }); // Added index for client history
                console.log("Object store 'mantenimientos' created.");
            }

            console.log('Base de datos actualizada correctamente');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Base de datos inicializada correctamente');

            // Manejar errores de versión posteriores
            db.onversionchange = (event) => {
                db.close();
                alert("La base de datos está desactualizada. Por favor, recarga la página.");
            };

            resolve(db);
        };
    });
}

// Funciones de autenticación
function login(username, password) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['mecanicos'], 'readonly');
        const store = transaction.objectStore('mecanicos');
        const index = store.index('usuario');
        const request = index.get(username);

        request.onsuccess = (event) => {
            const mechanic = event.target.result;
            if (mechanic && mechanic.contraseña === password) {
                currentUser = mechanic;
                resolve(true);
            } else if (username === 'admin' && password === '1303') {
                currentUser = { id: 0, usuario: 'admin', isAdmin: true };
                resolve(true);
            } else {
                reject('Usuario o contraseña incorrectos');
            }
        };

        request.onerror = (event) => {
            console.error("Login error:", event.target.error);
            reject('Error al buscar usuario');
        };
    });
}

// Funciones de gestión de clientes
function addClient(client) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['clientes'], 'readwrite');
        const store = transaction.objectStore('clientes');
        const request = store.add({
            ...client,
            // Add default/calculated values if needed
            proxima_visita: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Example
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error("Add client error:", event.target.error);
            reject('Error al agregar cliente: ' + event.target.error.message);
        };
    });
}

function getClients() {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['clientes'], 'readonly');
        const store = transaction.objectStore('clientes');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
             console.error("Get clients error:", event.target.error);
            reject('Error al obtener clientes');
        };
    });
}

// Added Function: Delete Client
function deleteClient(id) {
    if (!currentUser?.isAdmin) {
        alert('No tienes permisos para eliminar clientes');
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar al cliente con ID ${id}? Esta acción no se puede deshacer.`)) {
        return;
    }

    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['clientes'], 'readwrite');
        const store = transaction.objectStore('clientes');
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`Cliente ${id} eliminado`);
            updateClientsTable(); // Update table after deletion
            resolve();
        };
        request.onerror = (event) => {
            console.error("Delete client error:", event.target.error);
            reject('Error al eliminar cliente');
        };
    });
}


// Funciones de gestión de mecánicos
function addMechanic(mechanic) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para agregar mecánicos');
            return;
        }
        if (!db) { reject("La base de datos no está inicializada."); return; }

        const transaction = db.transaction(['mecanicos'], 'readwrite');
        const store = transaction.objectStore('mecanicos');
        const request = store.add(mechanic);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error("Add mechanic error:", event.target.error);
            if (event.target.error.name === 'ConstraintError') {
                 reject('Error al agregar mecánico: El nombre de usuario ya existe.');
            } else {
                 reject('Error al agregar mecánico: ' + event.target.error.message);
            }
        };
    });
}

function getMechanics() {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para ver mecánicos');
            return;
        }
        if (!db) { reject("La base de datos no está inicializada."); return; }

        const transaction = db.transaction(['mecanicos'], 'readonly');
        const store = transaction.objectStore('mecanicos');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
             console.error("Get mechanics error:", event.target.error);
            reject('Error al obtener mecánicos');
        };
    });
}

function deleteMechanic(id) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para eliminar mecánicos');
            return;
        }
        if (!db) { reject("La base de datos no está inicializada."); return; }

        if (!confirm(`¿Estás seguro de que quieres eliminar al mecánico con ID ${id}?`)) {
            return reject('Eliminación cancelada');
        }

        const transaction = db.transaction(['mecanicos'], 'readwrite');
        const store = transaction.objectStore('mecanicos');
        const request = store.delete(id);

        request.onsuccess = () => {
             console.log(`Mecánico ${id} eliminado`);
             updateMechanicsTable(); // Update table
             resolve();
        };
        request.onerror = (event) => {
            console.error("Delete mechanic error:", event.target.error);
            reject('Error al eliminar mecánico');
        };
    });
}

// Funciones de análisis de datos (Mantenimientos)
function addMaintenanceData(data) {
    return new Promise((resolve, reject) => {
        if (!currentUser) {
            reject('No hay usuario autenticado');
            return;
        }
         if (!db) { reject("La base de datos no está inicializada."); return; }

        // Simplificado: cualquier usuario logueado puede agregar, pero asociamos al usuario
        // En un sistema real, podría haber lógica de asignación cliente-mecánico

        const transaction = db.transaction(['mantenimientos'], 'readwrite');
        const store = transaction.objectStore('mantenimientos');
        const request = store.add({
            ...data,
            fecha: new Date().toISOString(),
            mecanicoId: currentUser.id, // Asociar con el usuario actual
            mecanicoUsuario: currentUser.usuario, // Guardar usuario para display
            estado: 'completado' // Asumir completado al agregar
            // clienteId debería venir en 'data' si se asocia a un cliente específico
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error("Add maintenance error:", event.target.error);
            reject('Error al agregar dato de mantenimiento');
        };
    });
}

function getMaintenanceData(period) { // Period in months
    return new Promise((resolve, reject) => {
        // Allow admin to see all, maybe mechanics see their own or assigned?
        // For now, only admin sees this view as per original logic.
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para ver datos de mantenimiento');
            return;
        }
        if (!db) { reject("La base de datos no está inicializada."); return; }

        const transaction = db.transaction(['mantenimientos'], 'readonly');
        const store = transaction.objectStore('mantenimientos');
        const request = store.getAll();

        request.onsuccess = () => {
            const data = request.result;
            let filteredData = data;
            if (period !== 999) { // 999 for "all time"
                const cutoffDate = new Date();
                cutoffDate.setMonth(cutoffDate.getMonth() - period);
                filteredData = data.filter(item =>
                    new Date(item.fecha) >= cutoffDate
                );
            }
            resolve(filteredData);
        };
        request.onerror = (event) => {
            console.error("Get maintenance data error:", event.target.error);
            reject('Error al obtener datos de mantenimiento');
        };
    });
}

// Funciones de regresión lineal (sin cambios)
function calculateRegression(x, y) {
    if (!x || !y || x.length !== y.length || x.length === 0) {
        return { slope: NaN, intercept: NaN, rSquared: NaN }; // Handle invalid input
    }
    const n = x.length;
    if (n < 2) return { slope: NaN, intercept: NaN, rSquared: NaN }; // Need at least 2 points

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);

    const denominator = (n * sumXX - sumX * sumX);
    if (Math.abs(denominator) < 1e-10) { // Avoid division by zero if all x are the same
         return { slope: NaN, intercept: sumY / n, rSquared: NaN };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calcular R²
    const meanY = sumY / n;
    const totalSS = y.reduce((a, b) => a + Math.pow(b - meanY, 2), 0);
    if (Math.abs(totalSS) < 1e-10) { // Avoid division by zero if all y are the same
        return { slope, intercept, rSquared: 1 }; // Perfect fit if all y are same? Or NaN? Let's use NaN for safety
    }
    const regressionSS = y.reduce((a, b, i) => {
        const predicted = slope * x[i] + intercept;
        return a + Math.pow(predicted - meanY, 2);
    }, 0);
    const rSquared = regressionSS / totalSS;

    return { slope, intercept, rSquared };
}

function generateAnalysis() {
    const period = parseInt(document.getElementById('analysisPeriod').value);
    // const type = document.getElementById('analysisType').value; // Type not used in this specific function

    getMaintenanceData(period).then(data => {
        const statsDiv = document.getElementById('statistics');
        const predictionSpan = document.getElementById('prediction');
        const slopeSpan = document.getElementById('slope');
        const interceptSpan = document.getElementById('intercept');
        const rSquaredSpan = document.getElementById('rSquared');

        // Clear previous results
        slopeSpan.textContent = '-';
        interceptSpan.textContent = '-';
        rSquaredSpan.textContent = '-';
        predictionSpan.textContent = '-';

        if (data.length < 2) { // Need at least 2 points for regression
            alert('No hay datos suficientes (se necesitan al menos 2) en el período seleccionado para el análisis de regresión.');
             // Clear chart if it exists
            if (window.myChart instanceof Chart) {
                window.myChart.destroy();
            }
            return;
        }

        // Filter out items potentially missing data
        const validData = data.filter(item => typeof item.kilometraje === 'number' && typeof item.costo === 'number');
        if (validData.length < 2) {
             alert('No hay suficientes datos válidos (kilometraje y costo numéricos) para el análisis.');
              if (window.myChart instanceof Chart) {
                window.myChart.destroy();
            }
             return;
        }

        const x = validData.map(item => item.kilometraje);
        const y = validData.map(item => item.costo);

        const regression = calculateRegression(x, y);

        if (isNaN(regression.slope)) {
            alert("No se pudo calcular la regresión. Verifique que los datos no sean constantes.");
            return;
        }

        // Actualizar estadísticas
        slopeSpan.textContent = regression.slope.toFixed(4);
        interceptSpan.textContent = regression.intercept.toFixed(2);
        rSquaredSpan.textContent = isNaN(regression.rSquared) ? 'N/A' : regression.rSquared.toFixed(4);

        // Calcular predicción para 100,000 km
        const predictionKm = 100000;
        const prediction = regression.slope * predictionKm + regression.intercept;
        predictionSpan.textContent = `$${prediction.toFixed(2)}`;

        // Crear gráfico
        const ctx = document.getElementById('regressionChart').getContext('2d');

        // Destruir gráfico existente si hay uno
        if (window.myChart instanceof Chart) {
            window.myChart.destroy();
        }

        // Crear puntos de la línea de regresión
        const minX = Math.min(...x);
        const maxX = Math.max(...x);
        // Ensure minX and maxX are valid numbers
        const regressionLine = (isNaN(minX) || isNaN(maxX)) ? [] : [
            { x: minX, y: regression.slope * minX + regression.intercept },
            { x: maxX, y: regression.slope * maxX + regression.intercept }
        ];

        window.myChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Datos de Mantenimiento',
                        data: validData.map(item => ({
                            x: item.kilometraje,
                            y: item.costo
                        })),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    ...(regressionLine.length > 0 ? [{ // Conditionally add regression line dataset
                        label: 'Línea de Regresión',
                        data: regressionLine,
                        type: 'line',
                        fill: false,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.1 // Makes the line straight
                    }] : [])
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow chart to resize vertically
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Kilometraje'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Costo de Mantenimiento ($)'
                        },
                        beginAtZero: true // Start y-axis at 0
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: (${context.parsed.x.toLocaleString()} km, $${context.parsed.y.toFixed(2)})`;
                            }
                        }
                    }
                }
            }
        });
    }).catch(error => {
        console.error("Analysis generation error:", error);
        alert('Error al generar análisis: ' + error);
    });
}


// Funciones de UI
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('mainScreen').classList.add('d-none');
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('mainScreen').classList.remove('d-none');
    document.getElementById('userDisplay').textContent = currentUser.usuario;

    const adminOnlyElements = document.querySelectorAll('.admin-only');

    if (currentUser.isAdmin) {
        adminOnlyElements.forEach(el => el.classList.remove('d-none'));
        document.querySelectorAll('.sidebar .nav-item').forEach(item => { // Show all sidebar items for admin
            item.classList.remove('d-none');
        });
        // Load initial data for admin tabs that are visible by default or first clicked
        updateClientsTable();
        updateMechanicsTable(); // This will be in a hidden tab initially if not default
        updateInventoryTable();
        updateCalendar();
         // Initial default tab click (e.g., clients)
        document.querySelector('.sidebar .nav-link[data-tab="clients"]').click();

    } else { // Non-admin user (mechanic)
        adminOnlyElements.forEach(el => el.classList.add('d-none'));
         // Hide admin-specific sidebar links
        document.querySelectorAll('.sidebar .nav-item.admin-only').forEach(item => {
            item.classList.add('d-none');
        });
        // Show relevant data for mechanics
        updateClientsTable();
        updateCalendar();
        updateInventoryTable(); // Mechanics might need this
        // Default tab for mechanic (e.g., appointments)
        document.querySelector('.sidebar .nav-link[data-tab="appointments"]').click();
    }
}

function updateClientsTable() {
    getClients().then(clients => {
        const tbody = document.getElementById('clientsTableBody');
        if (!tbody) return; // Prevent error if element not found
        tbody.innerHTML = ''; // Clear loading or previous data
        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">No hay clientes registrados.</td></tr>';
            return;
        }
        clients.forEach(client => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${client.id}</td>
                <td>${client.nombre || 'N/A'}</td>
                <td>${client.correo || 'N/A'}</td>
                <td>${client.marca_carro || 'N/A'} / ${client.modelo_carro || 'N/A'} (${client.anio_carro || 'N/A'})</td>
                <td>${client.placa || 'N/A'}</td>
                <td>${client.proxima_visita || 'N/A'}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="showClientDetails(${client.id})" title="Ver Detalles Cliente">
                        <i class="fas fa-address-card"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm ms-1" onclick="showVehicleDetailsById(${client.id})" title="Ver Detalles Vehículo">
                        <i class="fas fa-car"></i>
                    </button>
                    ${currentUser.isAdmin ? `
                        <button class="btn btn-danger btn-sm ms-1" onclick="deleteClient(${client.id})" title="Eliminar Cliente">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(error => {
        console.error("Error updating clients table:", error);
        const tbody = document.getElementById('clientsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger p-4">Error al cargar clientes.</td></tr>';
    });
}


function updateMechanicsTable() {
     if (!currentUser?.isAdmin) return; // Only admin sees this

    getMechanics().then(mechanics => {
        const tbody = document.getElementById('mechanicsTableBody');
         if (!tbody) return;
        tbody.innerHTML = '';
         if (mechanics.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4">No hay mecánicos registrados.</td></tr>';
            return;
        }
        mechanics.forEach(mechanic => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${mechanic.id}</td>
                <td>${mechanic.usuario}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteMechanic(${mechanic.id})" title="Eliminar Mecánico">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(error => {
         console.error("Error updating mechanics table:", error);
         const tbody = document.getElementById('mechanicsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger p-4">Error al cargar mecánicos.</td></tr>';
    });
}

// Función para crear el mecánico por defecto
function createDefaultMechanic() {
     if (!db) { console.error("DB not ready for default mechanic"); return; }
    const defaultMechanic = {
        usuario: 'george1',
        contraseña: '0000' // Plain text, NOT FOR PRODUCTION
    };

    const transaction = db.transaction(['mecanicos'], 'readwrite');
    const store = transaction.objectStore('mecanicos');
    const index = store.index('usuario');

    // Verificar si ya existe
    const request = index.get(defaultMechanic.usuario);

    request.onsuccess = (event) => {
        if (!event.target.result) {
            // Si no existe, lo creamos
            const addRequest = store.add(defaultMechanic);
            addRequest.onsuccess = () => console.log('Mecánico por defecto creado');
            addRequest.onerror = (e) => console.error("Error creating default mechanic:", e.target.error);
        } else {
             console.log("Mecánico por defecto ya existe.");
        }
    };
     request.onerror = (e) => console.error("Error checking for default mechanic:", e.target.error);
}

// Función para obtener el historial de visitas (mantenimientos) de un cliente
function getClientHistory(clientId) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['mantenimientos'], 'readonly');
        const store = transaction.objectStore('mantenimientos');
        // Use index for potentially better performance if data grows large
        const index = store.index('clienteId');
        const request = index.getAll(clientId); // Get all records for this client ID

        request.onsuccess = () => {
            // Sort visits by date, most recent first
            const visits = request.result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            resolve(visits);
        };

        request.onerror = (event) => {
            console.error("Get client history error:", event.target.error);
            reject('Error al obtener el historial del cliente');
        };
    });
}


// Función para mostrar los detalles del cliente en el modal
function showClientDetails(clientId) {
    if (!db) { alert("La base de datos no está lista."); return; }

    // Guardar clientId en el modal para usarlo en las funciones de exportación
    const modalElement = document.getElementById('clientDetailsModal');
    if (modalElement) {
        modalElement.dataset.clientId = clientId; // Aquí se guarda el ID
    } else {
        console.error("Modal de detalles del cliente no encontrado.");
        return;
    }

    const transaction = db.transaction(['clientes'], 'readonly');
    const store = transaction.objectStore('clientes');
    const request = store.get(clientId);

    request.onsuccess = (event) => {
        const client = event.target.result;
        if (client) {
            // Actualizar la información en el modal
            document.getElementById('modalClientName').textContent = client.nombre || 'N/A';
            document.getElementById('modalClientEmail').textContent = client.correo || 'N/A';
            document.getElementById('modalCarInfo').textContent = `${client.marca_carro || 'N/A'} ${client.modelo_carro || 'N/A'} (${client.anio_carro || 'N/A'}) - Placa: ${client.placa || 'N/A'}`;
            document.getElementById('modalLastRevision').textContent = client.revision || 'N/A';

            // Obtener y mostrar el historial de visitas (mantenimientos)
            const visitHistoryTbody = document.getElementById('visitHistoryTable');
            visitHistoryTbody.innerHTML = '<tr><td colspan="6" class="text-center p-3"><div class="loading-spinner mx-auto"></div> Cargando historial...</td></tr>';

            getClientHistory(clientId).then(visits => {
                visitHistoryTbody.innerHTML = ''; // Clear loading

                if (visits.length === 0) {
                    visitHistoryTbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay mantenimientos registrados</td></tr>';
                } else {
                    visits.forEach(visit => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${new Date(visit.fecha).toLocaleDateString()}</td>
                            <td>${visit.tipo || 'N/A'}</td>
                            <td>${visit.kilometraje ? visit.kilometraje.toLocaleString() + ' km' : 'N/A'}</td>
                            <td>${visit.costo ? '$' + visit.costo.toFixed(2) : 'N/A'}</td>
                            <td><span class="badge bg-success">${visit.estado || 'Completado'}</span></td>
                             <td>${visit.mecanicoUsuario || 'N/A'}</td>
                        `;
                        visitHistoryTbody.appendChild(tr);
                    });
                }

                // Lógica del gráfico de gastos
                const chartContainer = document.getElementById('clientExpensesChartContainer');
                const chartCanvas = document.getElementById('clientExpensesChart');
                if (!chartContainer || !chartCanvas) return;

                if (currentUser.isAdmin && visits.filter(v => v.costo > 0).length > 0) {
                    chartContainer.classList.remove('d-none');
                    const ctx = chartCanvas.getContext('2d');

                    if (window.clientExpensesChart instanceof Chart) {
                        window.clientExpensesChart.destroy();
                    }

                    const monthlyData = {};
                    visits.forEach(visit => {
                        if (visit.costo && visit.fecha) {
                            const date = new Date(visit.fecha);
                            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + visit.costo;
                        }
                    });

                    const sortedMonths = Object.keys(monthlyData).sort();
                    const sortedCosts = sortedMonths.map(month => monthlyData[month]);
                    const monthLabels = sortedMonths.map(monthKey => {
                        const [year, month] = monthKey.split('-');
                        return new Date(year, month - 1).toLocaleString('es-ES', { month: 'short', year: 'numeric'});
                    });

                    window.clientExpensesChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: monthLabels,
                            datasets: [{
                                label: 'Gastos Mensuales',
                                data: sortedCosts,
                                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            scales: { y: { beginAtZero: true, title: { display: true, text: 'Costo ($)' } } },
                            plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}` } } }
                        }
                    });
                } else {
                    chartContainer.classList.add('d-none');
                     if (window.clientExpensesChart instanceof Chart) window.clientExpensesChart.destroy(); // Clear chart if not admin or no data
                }

                if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show();

            }).catch(error => {
                console.error("Error fetching client history for modal:", error);
                visitHistoryTbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar historial.</td></tr>';
                if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show(); // Still show modal with basic info
            });
        } else {
             alert(`Cliente con ID ${clientId} no encontrado.`);
        }
    };
     request.onerror = (event) => {
        console.error("Error fetching client details:", event.target.error);
        alert('Error al obtener detalles del cliente.');
    };
}


// Funciones para el manejo de citas
function showAppointmentModal() {
    const select = document.getElementById('appointmentClient');
    if (!select) return;
    select.innerHTML = '<option value="">Cargando clientes...</option>';

    getClients().then(clients => {
        select.innerHTML = '<option value="" selected disabled>Seleccione un cliente...</option>';
        clients
            .sort((a,b) => (a.nombre || "").localeCompare(b.nombre || "")) // Sort clients by name
            .forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.nombre} (${client.placa || 'Sin Placa'})`;
            select.appendChild(option);
        });
    }).catch(error => {
        console.error("Error loading clients for appointment modal:", error);
         select.innerHTML = '<option value="">Error al cargar clientes</option>';
    });

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('appointmentDate');
     if(dateInput) dateInput.min = today;
    // Clear form
    const form = document.getElementById('appointmentForm');
    if (form) form.reset();


    const modalElement = document.getElementById('appointmentModal');
    if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function addAppointment(appointmentData) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
         if (!currentUser) { reject("Usuario no autenticado."); return; }

        const transaction = db.transaction(['citas'], 'readwrite');
        const store = transaction.objectStore('citas');

        const completeAppointment = {
            ...appointmentData,
            createdBy: currentUser.id,
            createdByName: currentUser.usuario,
            status: 'pendiente'
        };

        const request = store.add(completeAppointment);

        request.onsuccess = () => {
            console.log("Cita agendada:", request.result);
            updateCalendar();
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error("Add appointment error:", event.target.error);
            reject('Error al agendar la cita');
        };
    });
}

function getAppointments(startDate, endDate) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['citas'], 'readonly');
        const store = transaction.objectStore('citas');
        const index = store.index('fecha');
        const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString()); // Use ISO string for range
        const request = index.getAll(range);

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error("Get appointments error:", event.target.error);
            reject('Error al obtener las citas');
        };
    });
}


function updateCalendar() {
    const monthInput = document.getElementById('calendarMonth');
    const calendarBody = document.getElementById('appointmentCalendar');
    if (!monthInput || !calendarBody) {
         console.error("Calendar elements not found for update.");
         return;
    }
    calendarBody.innerHTML = '<tr><td colspan="7" class="text-center p-5"><div class="loading-spinner mx-auto"></div> Cargando calendario...</td></tr>';


    const [year, month] = monthInput.value.split('-').map(Number);
    if (!year || !month) {
        console.error("Invalid month input value for calendar:", monthInput.value);
        calendarBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger p-5">Error: Fecha de mes inválida.</td></tr>';
        return;
    }

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Calculate start and end dates for fetching appointments (covering partial weeks)
    const calendarStartDate = new Date(firstDayOfMonth);
    calendarStartDate.setDate(calendarStartDate.getDate() - (calendarStartDate.getDay() === 0 ? 6 : calendarStartDate.getDay() - 1)); // Start from Monday of the first week

    const calendarEndDate = new Date(year, month - 1, daysInMonth);
    calendarEndDate.setDate(calendarEndDate.getDate() + (7 - (calendarEndDate.getDay() === 0 ? 7 : calendarEndDate.getDay()))); // End on Sunday of the last week

    getAppointments(calendarStartDate, calendarEndDate).then(appointments => {
        calendarBody.innerHTML = ''; // Clear previous calendar

        const appointmentsByDate = {};
        appointments.forEach(app => {
            const dateKey = app.fecha.substring(0, 10);
            if (!appointmentsByDate[dateKey]) {
                appointmentsByDate[dateKey] = [];
            }
            appointmentsByDate[dateKey].push(app);
        });

        let currentDate = new Date(calendarStartDate);
        while (currentDate < calendarEndDate) {
            const weekRow = calendarBody.insertRow();
            for (let i = 0; i < 7; i++) { // 7 days a week
                const cell = weekRow.insertCell();
                cell.classList.add('calendar-day');
                const dateKey = currentDate.toISOString().substring(0, 10);

                if (currentDate.getMonth() !== month - 1) {
                    cell.classList.add('other-month');
                } else if (currentDate.toDateString() === new Date().toDateString()){
                    cell.classList.add('bg-info-subtle'); // Highlight today
                }


                const dayNumberDiv = document.createElement('div');
                dayNumberDiv.classList.add('day-number');
                dayNumberDiv.textContent = currentDate.getDate();
                cell.appendChild(dayNumberDiv);

                if (appointmentsByDate[dateKey]) {
                    appointmentsByDate[dateKey].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                    appointmentsByDate[dateKey].forEach(app => {
                        const appDiv = document.createElement('div');
                        appDiv.classList.add('appointment-card', app.status || 'pendiente');
                        appDiv.innerHTML = `
                            <small><strong>${new Date(app.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong></small>
                            <small>${app.clientName || 'Cliente?'}</small>
                            <small><em>${app.service || 'Servicio?'}</em></small>
                        `;
                        appDiv.title = `Cliente: ${app.clientName}\nServicio: ${app.service}\nEstado: ${app.status}\nNotas: ${app.notes || 'Ninguna'}`;
                        cell.appendChild(appDiv);
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    }).catch(error => {
        console.error("Error updating calendar:", error);
        calendarBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger p-5">Error al cargar el calendario.</td></tr>';
    });
}

// Funciones para el manejo de inventario
function showInventoryModal(itemId = null) {
    const modalElement = document.getElementById('inventoryModal');
    if (!modalElement) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const form = document.getElementById('inventoryForm');
    const modalTitle = document.getElementById('inventoryModalTitle');
    const hiddenItemIdInput = document.getElementById('editItemId');

    form.reset();
    hiddenItemIdInput.value = '';

    if (itemId) {
         modalTitle.textContent = 'Editar Pieza del Inventario';
         editInventoryItem(itemId);
    } else {
        modalTitle.textContent = 'Agregar Pieza al Inventario';
    }
    modal.show();
}

function editInventoryItem(id) {
    if (!db) { alert("La base de datos no está lista."); return; }
    const transaction = db.transaction(['inventario'], 'readonly');
    const store = transaction.objectStore('inventario');
    const request = store.get(id);

    request.onsuccess = (event) => {
        const item = event.target.result;
        if (item) {
            document.getElementById('editItemId').value = item.id;
            document.getElementById('partCode').value = item.code || '';
            document.getElementById('partName').value = item.name || '';
            document.getElementById('partCategory').value = item.category || '';
            document.getElementById('partStock').value = item.stock === undefined ? '' : item.stock;
            document.getElementById('partMinStock').value = item.minStock === undefined ? '' : item.minStock;
            document.getElementById('partPrice').value = item.price === undefined ? '' : item.price;
            document.getElementById('partSupplier').value = item.supplier || '';
            document.getElementById('partLocation').value = item.location || '';
        } else {
            alert(`Pieza con ID ${id} no encontrada.`);
             const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
             if (modal) modal.hide();
        }
    };
    request.onerror = (event) => {
        console.error("Error fetching inventory item for edit:", event.target.error);
        alert('Error al cargar datos de la pieza.');
    };
}

function saveInventoryItem() {
    const itemId = document.getElementById('editItemId').value;
    const part = {
        code: document.getElementById('partCode').value.trim(),
        name: document.getElementById('partName').value.trim(),
        category: document.getElementById('partCategory').value,
        stock: parseInt(document.getElementById('partStock').value),
        minStock: parseInt(document.getElementById('partMinStock').value),
        price: parseFloat(document.getElementById('partPrice').value),
        supplier: document.getElementById('partSupplier').value.trim(),
        location: document.getElementById('partLocation').value.trim()
    };

    if (!part.code || !part.name || !part.category || isNaN(part.stock) || isNaN(part.minStock) || isNaN(part.price)) {
        alert('Por favor, complete todos los campos requeridos correctamente (Código, Nombre, Categoría, Stock, Stock Mínimo, Precio).');
        return;
    }

    const promise = itemId
        ? updateInventoryItem({ ...part, id: parseInt(itemId) })
        : addInventoryItem(part);

    promise.then(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
        if (modal) modal.hide();
        document.getElementById('inventoryForm').reset();
        document.getElementById('editItemId').value = '';
        updateInventoryTable();
        alert(`Pieza ${itemId ? 'actualizada' : 'guardada'} correctamente.`);
    }).catch(error => {
         console.error("Error saving/updating inventory item:", error);
        alert('Error al guardar la pieza: ' + error);
    });
}

function addInventoryItem(part) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');
        const request = store.add(part);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            if (event.target.error.name === 'ConstraintError') {
                 reject('El código de pieza ya existe.');
            } else {
                reject('Error al guardar la pieza: ' + event.target.error.message);
            }
        };
    });
}

function updateInventoryItem(part) {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');
        const request = store.put(part);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
             if (event.target.error.name === 'ConstraintError') {
                 reject('El código de pieza ya existe (conflicto al actualizar).');
            } else {
                reject('Error al actualizar la pieza: ' + event.target.error.message);
            }
        };
    });
}

function deleteInventoryItem(id) {
    if (!confirm(`¿Estás seguro de que quieres eliminar la pieza con ID ${id}?`)) {
        return;
    }
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`Pieza ${id} eliminada`);
            updateInventoryTable();
            resolve();
        };
        request.onerror = (event) => {
            console.error("Delete inventory item error:", event.target.error);
            reject('Error al eliminar la pieza');
        };
    });
}

function getInventoryItems() {
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['inventario'], 'readonly');
        const store = transaction.objectStore('inventario');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error("Get inventory items error:", event.target.error);
            reject('Error al obtener el inventario');
        };
    });
}

function updateInventoryTable() {
    getInventoryItems().then(items => {
        const tbody = document.getElementById('inventoryTableBody');
         if (!tbody) return;
        tbody.innerHTML = '';
         if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4">El inventario está vacío.</td></tr>';
            return;
        }

        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        items.forEach(item => {
            const stockLevelClass = item.stock <= item.minStock ? 'table-danger' : item.stock <= item.minStock * 1.2 ? 'table-warning' : '';
            const tr = document.createElement('tr');
            tr.className = stockLevelClass;
            tr.innerHTML = `
                <td>${item.code || 'N/A'}</td>
                <td>${item.name || 'N/A'}</td>
                <td>${item.category || 'N/A'}</td>
                <td>${item.stock !== undefined ? item.stock : 'N/A'} ${item.stock <= item.minStock ? '<i class="fas fa-exclamation-triangle text-danger ms-1" title="Stock Bajo"></i>' : ''}</td>
                <td>${item.minStock !== undefined ? item.minStock : 'N/A'}</td>
                <td>${item.price !== undefined ? '$' + item.price.toFixed(2) : 'N/A'}</td>
                <td>${item.supplier || 'N/A'}</td>
                <td>${item.location || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="showInventoryModal(${item.id})" title="Editar Pieza">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger ms-1" onclick="deleteInventoryItem(${item.id})" title="Eliminar Pieza">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(error => {
        console.error("Error updating inventory table:", error);
        const tbody = document.getElementById('inventoryTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger p-4">Error al cargar inventario.</td></tr>';
    });
}


// Funciones para reportes
function generateReport() {
    const type = document.getElementById('reportType').value;
    const month = document.getElementById('reportMonth').value;
     const reportContent = document.getElementById('reportContent');
     if (!reportContent) return;

     reportContent.innerHTML = '<div class="text-center p-4"><div class="loading-spinner mx-auto"></div><p class="mt-2">Generando reporte...</p></div>';

    if (!month) {
        reportContent.innerHTML = '<div class="alert alert-warning">Por favor, seleccione un mes para el reporte.</div>';
        return;
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1); // Next month's first day for < comparison

    switch(type) {
        case 'services': generateServiceReport(startDate, endDate); break;
        case 'mechanics': generateMechanicReport(startDate, endDate); break;
        case 'inventory': generateInventoryReport(); break; // Not typically month-based
        case 'vehicles': generateVehicleReport(); break; // Not typically month-based
        default: reportContent.innerHTML = '<div class="alert alert-danger">Tipo de reporte no válido.</div>';
    }
}

function getMaintenanceDataForAllTime() { // Helper for reports
    return new Promise((resolve, reject) => {
        if (!db) { reject("La base de datos no está inicializada."); return; }
        const transaction = db.transaction(['mantenimientos'], 'readonly');
        const store = transaction.objectStore('mantenimientos');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error al obtener todos los datos de mantenimiento: ' + event.target.error.message);
    });
}

function generateServiceReport(startDate, endDate) {
    getMaintenanceDataForAllTime().then(allMaintenance => {
        const reportContent = document.getElementById('reportContent');
        if (!reportContent) return;

        const filteredMaintenance = allMaintenance.filter(m => {
            const date = new Date(m.fecha);
            return date >= startDate && date < endDate;
        });

        if (filteredMaintenance.length === 0) {
            reportContent.innerHTML = `<h4>Reporte de Servicios (${startDate.toLocaleString('default', { month: 'long', year: 'numeric'})})</h4><div class="alert alert-info">No se encontraron servicios en el período seleccionado.</div>`;
            return;
        }

        const servicesCount = {}; let totalCost = 0; let totalPreventivo = 0; let totalCorrectivo = 0;
        filteredMaintenance.forEach(m => {
            const serviceType = m.tipo || 'Desconocido';
            servicesCount[serviceType] = (servicesCount[serviceType] || 0) + 1;
            totalCost += m.costo || 0;
            if (m.tipo === 'preventivo') totalPreventivo++; if (m.tipo === 'correctivo') totalCorrectivo++;
        });

        let html = `<h4>Reporte de Servicios (${startDate.toLocaleString('default', { month: 'long', year: 'numeric'})})</h4>`;
        html += `<p><strong>Total Servicios:</strong> ${filteredMaintenance.length}</p>`;
        html += `<p><strong>Costo Total:</strong> $${totalCost.toFixed(2)}</p>`;
        html += `<p><strong>Servicios Preventivos:</strong> ${totalPreventivo}</p><p><strong>Servicios Correctivos:</strong> ${totalCorrectivo}</p>`;
        html += '<h5 class="mt-3">Desglose por Tipo:</h5><table class="table table-sm table-striped"><thead><tr><th>Tipo</th><th>Cantidad</th></tr></thead><tbody>';
        Object.entries(servicesCount).sort(([,a],[,b]) => b-a).forEach(([service, count]) => html += `<tr><td>${service}</td><td>${count}</td></tr>`);
        html += '</tbody></table>';
        reportContent.innerHTML = html;
    }).catch(err => { reportContent.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

function generateMechanicReport(startDate, endDate) {
     getMaintenanceDataForAllTime().then(allMaintenance => {
        const reportContent = document.getElementById('reportContent'); if (!reportContent) return;
        const filteredMaintenance = allMaintenance.filter(m => new Date(m.fecha) >= startDate && new Date(m.fecha) < endDate);

        if (filteredMaintenance.length === 0) {
            reportContent.innerHTML = `<h4>Rendimiento de Mecánicos (${startDate.toLocaleString('default', { month: 'long', year: 'numeric'})})</h4><div class="alert alert-info">No hay datos.</div>`;
            return;
        }
        const perf = {};
        filteredMaintenance.forEach(m => {
            const mech = m.mecanicoUsuario || 'Desconocido';
            if (!perf[mech]) perf[mech] = { count: 0, totalCost: 0, services: {} };
            perf[mech].count++; perf[mech].totalCost += m.costo || 0;
            const sType = m.tipo || 'N/A';
            perf[mech].services[sType] = (perf[mech].services[sType] || 0) + 1;
        });
        let html = `<h4>Rendimiento de Mecánicos (${startDate.toLocaleString('default', { month: 'long', year: 'numeric'})})</h4>`;
        html += '<table class="table table-sm table-striped"><thead><tr><th>Mecánico</th><th># Servicios</th><th>Costo Total</th><th>Detalle</th></tr></thead><tbody>';
        Object.entries(perf).sort(([,a],[,b]) => b.count - a.count).forEach(([mech, data]) => {
            let sDetails = Object.entries(data.services).map(([t,c]) => `${t}: ${c}`).join('<br>');
            html += `<tr><td>${mech}</td><td>${data.count}</td><td>$${data.totalCost.toFixed(2)}</td><td><small>${sDetails}</small></td></tr>`;
        });
        html += '</tbody></table>'; reportContent.innerHTML = html;
    }).catch(err => { reportContent.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

function generateInventoryReport() {
    getInventoryItems().then(items => {
        const reportContent = document.getElementById('reportContent'); if (!reportContent) return;
        if (items.length === 0) { reportContent.innerHTML = '<h4>Reporte de Inventario</h4><div class="alert alert-info">Inventario vacío.</div>'; return; }

        const totalValue = items.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0);
        const lowStock = items.filter(item => item.stock <= item.minStock);
        const byCat = items.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});

        let html = `<h4>Reporte de Inventario (Actual)</h4>`;
        html += `<p><strong># Tipos Piezas:</strong> ${items.length}</p><p><strong>Valor Total Stock:</strong> $${totalValue.toFixed(2)}</p>`;
        html += `<p><strong>Piezas Stock Bajo (${lowStock.length}):</strong></p>`;
        if (lowStock.length > 0) {
            html += '<ul class="list-group mb-3 list-group-flush">';
            lowStock.forEach(i => html += `<li class="list-group-item list-group-item-warning p-2 d-flex justify-content-between"><span>${i.name} (${i.code})</span> <span class="badge bg-danger">Stock: ${i.stock} (Min: ${i.minStock})</span></li>`);
            html += '</ul>';
        } else { html += '<p class="text-success">Ninguna pieza con stock bajo.</p>'; }
        html += '<h5 class="mt-3">Piezas por Categoría:</h5><table class="table table-sm table-striped"><thead><tr><th>Categoría</th><th>Cantidad</th></tr></thead><tbody>';
        Object.entries(byCat).sort(([,a],[,b]) => b-a).forEach(([cat, count]) => html += `<tr><td>${cat}</td><td>${count}</td></tr>`);
        html += '</tbody></table>'; reportContent.innerHTML = html;
    }).catch(err => { reportContent.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

function generateVehicleReport() {
    getClients().then(clients => {
        const reportContent = document.getElementById('reportContent'); if (!reportContent) return;
        if (clients.length === 0) { reportContent.innerHTML = '<h4>Reporte de Vehículos</h4><div class="alert alert-info">No hay vehículos.</div>'; return; }

        const byBrand = clients.reduce((acc, c) => { const b = c.marca_carro || 'Desconocida'; acc[b] = (acc[b] || 0) + 1; return acc; }, {});
        const byYear = clients.reduce((acc, c) => { const y = c.anio_carro || 'Desconocido'; acc[y] = (acc[y] || 0) + 1; return acc; }, {});

        let html = `<h4>Reporte de Vehículos (Clientes Registrados)</h4><p><strong>Total Vehículos:</strong> ${clients.length}</p>`;
        html += '<div class="row"><div class="col-md-6">';
        html += '<h5 class="mt-3">Vehículos por Marca:</h5><table class="table table-sm table-striped"><thead><tr><th>Marca</th><th>Cantidad</th></tr></thead><tbody>';
        Object.entries(byBrand).sort(([,a],[,b]) => b-a).forEach(([b, count]) => html += `<tr><td>${b}</td><td>${count}</td></tr>`);
        html += '</tbody></table></div><div class="col-md-6">';
        html += '<h5 class="mt-3">Vehículos por Año:</h5><table class="table table-sm table-striped"><thead><tr><th>Año</th><th>Cantidad</th></tr></thead><tbody>';
        Object.entries(byYear).sort((a,b) => b[0].localeCompare(a[0])).forEach(([y, count]) => html += `<tr><td>${y}</td><td>${count}</td></tr>`); // Sort by year desc
        html += '</tbody></table></div></div>';
        reportContent.innerHTML = html;
    }).catch(err => { reportContent.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`; });
}

// Funciones para gestión de vehículos
function searchVehicle() {
    const searchTerm = document.getElementById('vehicleSearch').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('vehicleSearchResults');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '<div class="text-center p-3"><div class="loading-spinner mx-auto"></div> Buscando...</div>';

    if (!searchTerm) {
        resultsDiv.innerHTML = '<p class="text-muted text-center p-3">Ingrese una placa o nombre de cliente para buscar.</p>';
        return;
    }

    getClients().then(clients => {
        const matchingClients = clients.filter(client =>
             (client.placa && client.placa.toLowerCase().includes(searchTerm)) ||
             (client.nombre && client.nombre.toLowerCase().includes(searchTerm))
        );

        if (matchingClients.length > 0) {
             resultsDiv.innerHTML = '<ul class="list-group">';
            matchingClients.forEach(client => {
                resultsDiv.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>
                            <strong>${client.nombre || 'N/A'}</strong> - ${client.marca_carro || '?'} ${client.modelo_carro || '?'} (${client.anio_carro || '?'}) - Placa: ${client.placa || 'N/A'}
                        </span>
                        <button class="btn btn-sm btn-info" onclick="showVehicleDetailsById(${client.id})">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    </li>
                `;
            });
             resultsDiv.innerHTML += '</ul>';
        } else {
            resultsDiv.innerHTML = '<div class="alert alert-warning text-center">No se encontraron vehículos que coincidan.</div>';
        }
    }).catch(error => {
        console.error("Error searching vehicles:", error);
        resultsDiv.innerHTML = '<div class="alert alert-danger text-center">Error al realizar la búsqueda.</div>';
    });
}

function showVehicleDetailsById(clientId) {
    if (!db) { alert("La base de datos no está lista."); return; }
    const transaction = db.transaction(['clientes'], 'readonly');
    const store = transaction.objectStore('clientes');
    const request = store.get(clientId);

    request.onsuccess = (event) => {
        const client = event.target.result;
        if (client) {
            showVehicleDetails(client);
        } else {
            alert(`No se encontró el cliente/vehículo con ID ${clientId}.`);
        }
    };
    request.onerror = (event) => {
        console.error("Error fetching client for vehicle details:", event.target.error);
        alert('Error al cargar los datos del vehículo.');
    };
}

function showVehicleDetails(client) {
    const modalElement = document.getElementById('vehicleModal');
    if (!modalElement) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

    document.getElementById('vehiclePlate').textContent = client.placa || 'N/A';
    document.getElementById('vehicleMake').textContent = client.marca_carro || 'N/A';
    document.getElementById('vehicleModel').textContent = client.modelo_carro || 'N/A';
    document.getElementById('vehicleYear').textContent = client.anio_carro || 'N/A';
    const currentMileage = client.kilometraje !== undefined ? client.kilometraje.toLocaleString() + ' km' : 'N/A';
    document.getElementById('vehicleMileage').textContent = currentMileage;

    document.getElementById('vehicleSoat').textContent = client.soat ? new Date(client.soat).toLocaleDateString() : 'No registrado';
    document.getElementById('vehicleTechReview').textContent = client.revision_tecnica ? new Date(client.revision_tecnica).toLocaleDateString() : 'No registrado';
    document.getElementById('nextMaintenance').textContent = calculateNextMaintenance(client.kilometraje);

    loadVehicleHistory(client.id);
    modal.show();
}

function calculateNextMaintenance(kilometraje) {
    if (kilometraje === undefined || kilometraje === null || isNaN(kilometraje)) return 'Kilometraje no registrado';
    const interval = 5000;
    const nextKm = Math.ceil((kilometraje + 1) / interval) * interval;
    return `A los ${nextKm.toLocaleString()} km (aprox.)`;
}

function loadVehicleHistory(clientId) {
    const tbody = document.getElementById('vehicleHistoryTableBody');
     if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3"><div class="loading-spinner mx-auto"></div> Cargando historial...</td></tr>';

    getClientHistory(clientId).then(visits => {
        tbody.innerHTML = '';
        if (visits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3">No hay historial de mantenimiento.</td></tr>';
            return;
        }
        visits.forEach(visit => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(visit.fecha).toLocaleDateString()}</td>
                <td>${visit.tipo || 'N/A'}</td>
                <td>${visit.kilometraje ? visit.kilometraje.toLocaleString() + ' km' : 'N/A'}</td>
                <td>${visit.mecanicoUsuario || 'N/A'}</td>
                <td>${visit.costo ? '$' + visit.costo.toFixed(2) : 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(error => {
         console.error("Error loading vehicle history:", error);
         tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger p-3">Error al cargar historial.</td></tr>';
    });
}

// --- Funciones de Exportación de Cliente Específico ---

async function getClientDataForExport(clientId) {
    if (!db) {
        throw new Error("La base de datos no está inicializada.");
    }

    const clientTransaction = db.transaction(['clientes'], 'readonly');
    const clientStore = clientTransaction.objectStore('clientes');
    const clientRequest = clientStore.get(clientId);

    const client = await new Promise((resolve, reject) => {
        clientRequest.onsuccess = event => resolve(event.target.result);
        clientRequest.onerror = event => reject('Error al obtener datos del cliente: ' + event.target.error);
    });

    if (!client) {
        throw new Error(`Cliente con ID ${clientId} no encontrado.`);
    }

    const history = await getClientHistory(clientId); // Reutilizamos la función existente

    return { client, history };
}

async function exportClientToPdf() {
    const modalElement = document.getElementById('clientDetailsModal');
    const clientId = parseInt(modalElement.dataset.clientId); // Obtener ID del atributo data

    if (isNaN(clientId)) {
        alert("No se pudo obtener el ID del cliente para exportar.");
        return;
    }

    try {
        const { client, history } = await getClientDataForExport(clientId);
        const { jsPDF } = window.jspdf; // Acceder a jsPDF desde el objeto window
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Reporte del Cliente: ${client.nombre || 'N/A'}`, 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100);

        let yPos = 30;
        const lineHeight = 7;
        const sectionSpacing = 5;

        // Información del Cliente
        doc.setFontSize(14);
        doc.text("Información del Cliente", 14, yPos);
        yPos += lineHeight;
        doc.setFontSize(10);
        doc.text(`ID: ${client.id}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Nombre: ${client.nombre || 'N/A'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Correo: ${client.correo || 'N/A'}`, 14, yPos);
        yPos += sectionSpacing;

        // Información del Vehículo
        yPos += lineHeight;
        doc.setFontSize(14);
        doc.text("Información del Vehículo", 14, yPos);
        yPos += lineHeight;
        doc.setFontSize(10);
        doc.text(`Placa: ${client.placa || 'N/A'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Marca: ${client.marca_carro || 'N/A'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Modelo: ${client.modelo_carro || 'N/A'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Año: ${client.anio_carro || 'N/A'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Kilometraje Actual: ${client.kilometraje ? client.kilometraje.toLocaleString() + ' km' : 'N/A'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Motivo Visita Inicial: ${client.revision || 'N/A'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Vencimiento SOAT: ${client.soat ? new Date(client.soat).toLocaleDateString() : 'No registrado'}`, 14, yPos);
        yPos += lineHeight;
        doc.text(`Vencimiento Rev. Técnica: ${client.revision_tecnica ? new Date(client.revision_tecnica).toLocaleDateString() : 'No registrado'}`, 14, yPos);
        yPos += sectionSpacing;


        // Historial de Mantenimientos
        yPos += lineHeight;
        doc.setFontSize(14);
        doc.text("Historial de Mantenimientos", 14, yPos);
        yPos += lineHeight / 2; // Menor espacio antes de la tabla

        if (history.length > 0) {
            const tableColumn = ["Fecha", "Tipo", "Kilometraje", "Costo ($)", "Estado", "Mecánico"];
            const tableRows = [];

            history.forEach(visit => {
                const visitData = [
                    new Date(visit.fecha).toLocaleDateString(),
                    visit.tipo || 'N/A',
                    visit.kilometraje ? visit.kilometraje.toLocaleString() + ' km' : 'N/A',
                    visit.costo ? visit.costo.toFixed(2) : 'N/A',
                    visit.estado || 'Completado',
                    visit.mecanicoUsuario || 'N/A'
                ];
                tableRows.push(visitData);
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: yPos,
                theme: 'striped', // 'striped', 'grid', 'plain'
                headStyles: { fillColor: [22, 160, 133] }, // Color de cabecera
                styles: { fontSize: 8, cellPadding: 1.5 },
                columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 30 }, 3: { halign: 'right' } } // Ajustar ancho de columnas
            });
        } else {
            doc.setFontSize(10);
            doc.text("No hay historial de mantenimientos registrado.", 14, yPos + lineHeight);
        }

        const fileName = `Reporte_Cliente_${client.nombre ? client.nombre.replace(/\s+/g, '_') : client.id}.pdf`;
        doc.save(fileName);
        alert(`PDF "${fileName}" generado.`);

    } catch (error) {
        console.error("Error al exportar cliente a PDF:", error);
        alert("Error al generar el PDF del cliente: " + error.message);
    }
}

async function exportClientToCsv() {
    const modalElement = document.getElementById('clientDetailsModal');
    const clientId = parseInt(modalElement.dataset.clientId);

    if (isNaN(clientId)) {
        alert("No se pudo obtener el ID del cliente para exportar.");
        return;
    }

    try {
        const { client, history } = await getClientDataForExport(clientId);

        let csvContent = "";

        // Client Info Section
        csvContent += "Informacion del Cliente\r\n";
        csvContent += `ID,"${client.id}"\r\n`;
        csvContent += `Nombre,"${client.nombre || ''}"\r\n`;
        csvContent += `Correo,"${client.correo || ''}"\r\n`;
        csvContent += "\r\n"; // Blank line

        // Vehicle Info Section
        csvContent += "Informacion del Vehiculo\r\n";
        csvContent += `Placa,"${client.placa || ''}"\r\n`;
        csvContent += `Marca,"${client.marca_carro || ''}"\r\n`;
        csvContent += `Modelo,"${client.modelo_carro || ''}"\r\n`;
        csvContent += `Año,"${client.anio_carro || ''}"\r\n`;
        csvContent += `Kilometraje Actual,"${client.kilometraje !== undefined ? client.kilometraje : ''}"\r\n`;
        csvContent += `Motivo Visita Inicial,"${client.revision || ''}"\r\n`;
        csvContent += `Vencimiento SOAT,"${client.soat ? new Date(client.soat).toLocaleDateString() : ''}"\r\n`;
        csvContent += `Vencimiento Rev. Técnica,"${client.revision_tecnica ? new Date(client.revision_tecnica).toLocaleDateString() : ''}"\r\n`;
        csvContent += "\r\n"; // Blank line

        // Maintenance History Section
        csvContent += "Historial de Mantenimientos\r\n";
        if (history.length > 0) {
            const historyForCsv = history.map(visit => ({
                Fecha: new Date(visit.fecha).toLocaleDateString(),
                Tipo: visit.tipo || '',
                Kilometraje: visit.kilometraje !== undefined ? visit.kilometraje : '',
                Costo: visit.costo !== undefined ? visit.costo.toFixed(2) : '',
                Estado: visit.estado || 'Completado',
                Mecanico: visit.mecanicoUsuario || ''
            }));
            csvContent += Papa.unparse(historyForCsv, { header: true });
        } else {
            csvContent += "No hay historial de mantenimientos registrado.\r\n";
        }

        const fileName = `Reporte_Cliente_${client.nombre ? client.nombre.replace(/\s+/g, '_') : client.id}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        alert(`CSV "${fileName}" generado.`);

    } catch (error) {
        console.error("Error al exportar cliente a CSV:", error);
        alert("Error al generar el CSV del cliente: " + error.message);
    }
}


// Función para exportar reportes avanzados
function exportAdvancedReport() {
    const format = document.getElementById('exportFormat').value;
    const includeGraphics = document.getElementById('includeGraphics').value === 'yes';
    const detailLevel = document.getElementById('detailLevel').value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `reporte_mantenimiento_${detailLevel}_${timestamp}`;

    getMaintenanceDataForAllTime().then(data => {
        if (data.length === 0) { alert("No hay datos de mantenimiento para exportar."); return; }
        const reportData = prepareReportData(data, detailLevel);
        switch (format) {
            case 'pdf': exportToPdf(reportData, fileName, includeGraphics); break; // General PDF needs specific implementation
            case 'excel': exportToExcel(reportData, fileName); break; // General Excel needs specific implementation
            case 'csv': exportToCsvGeneral(reportData, fileName); break; // Renamed to avoid conflict
            case 'json': exportToJson(reportData, fileName); break;
            default: alert("Formato no válido.");
        }
    }).catch(error => { console.error('Error exportando:', error); alert('Error al generar reporte.'); });
}

function prepareReportData(data, detailLevel) {
    const calcStats = (arr) => {
        if (arr.length === 0) return { totalMantenimientos: 0, costoTotal: 0, costoPromedio: 0, preventivos: 0, correctivos: 0, fechaInforme: new Date().toLocaleString() };
        const costs = arr.map(item => item.costo || 0);
        const costTotal = costs.reduce((sum, cost) => sum + cost, 0);
        return {
            totalMantenimientos: arr.length, costoTotal,
            costoPromedio: arr.length > 0 ? costTotal / arr.length : 0,
            preventivos: arr.filter(item => item.tipo === 'preventivo').length,
            correctivos: arr.filter(item => item.tipo === 'correctivo').length,
            fechaInforme: new Date().toLocaleString()
        };
    };
    const summaryData = calcStats(data);
    switch (detailLevel) {
        case 'summary': return { summary: summaryData, details: null };
        case 'detailed':
            return {
                summary: summaryData,
                details: data.map(item => ({
                    Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A', Kilometraje: item.kilometraje,
                    Costo: item.costo !== undefined ? item.costo.toFixed(2) : 'N/A', Tipo: item.tipo, Mecanico: item.mecanicoUsuario
                }))
            };
        case 'complete': default:
             return {
                 summary: summaryData,
                 details: data.map(item => ({
                    ID: item.id, FechaISO: item.fecha ? new Date(item.fecha).toISOString() : 'N/A', Kilometraje: item.kilometraje,
                    Costo: item.costo, Tipo: item.tipo, Estado: item.estado, MecanicoID: item.mecanicoId,
                    MecanicoUsuario: item.mecanicoUsuario, ClienteID: item.clienteId
                 }))
             };
    }
}

// Renamed exportToCsv to exportToCsvGeneral for general reports
function exportToCsvGeneral(data, fileName) {
     if (!data || (!data.summary && (!data.details || data.details.length === 0))) { alert("No hay datos para CSV."); return; }
     let csvContent = "";
     if (data.summary) {
         csvContent += "Resumen del Reporte General de Mantenimientos\r\n";
         Object.entries(data.summary).forEach(([key, value]) => csvContent += `"${key.replace(/_/g, ' ')}","${value}"\r\n`);
         csvContent += "\r\n";
     }
     if (data.details && data.details.length > 0) {
         csvContent += Papa.unparse(data.details, { header: true, quotes: true });
     } else if (!data.summary) { alert("No hay detalles para CSV."); return; }

     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement("a");
     link.href = URL.createObjectURL(blob);
     link.download = `${fileName}.csv`;
     document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
}
function exportToJson(data, fileName) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    initDB()
        .then(() => {
            console.log('Base de datos lista.'); createDefaultMechanic(); showLoginScreen();

            document.getElementById('loginForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = document.getElementById('username').value, p = document.getElementById('password').value;
                login(u, p).then(() => { showMainScreen(); document.getElementById('password').value = ''; })
                           .catch(err => { alert('Login fallido: ' + err); document.getElementById('password').value = ''; });
            });
            document.getElementById('logoutBtn')?.addEventListener('click', () => { currentUser = null; showLoginScreen(); });

            const dmSwitch = document.getElementById('darkModeSwitch');
            if(dmSwitch) {
                const savedMode = localStorage.getItem('darkMode');
                if (savedMode === 'enabled') { document.body.classList.add('dark-mode'); dmSwitch.checked = true; }
                dmSwitch.addEventListener('change', (e) => {
                    document.body.classList.toggle('dark-mode', e.target.checked);
                    localStorage.setItem('darkMode', e.target.checked ? 'enabled' : 'disabled');
                });
            }

            document.getElementById('clientForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const client = {
                    nombre: document.getElementById('clientName').value, correo: document.getElementById('clientEmail').value,
                    placa: document.getElementById('clientPlate').value.toUpperCase(), marca_carro: document.getElementById('carMake').value,
                    modelo_carro: document.getElementById('carModel').value, anio_carro: document.getElementById('carYear').value,
                    kilometraje: parseInt(document.getElementById('carMileage').value) || 0,
                    soat: document.getElementById('carSoat').value || null, revision_tecnica: document.getElementById('carTechReview').value || null,
                    revision: document.getElementById('revisionType').value
                };
                if (!client.nombre || !client.placa || !client.marca_carro || !client.modelo_carro) { alert("Campos obligatorios: Nombre, Placa, Marca, Modelo."); return; }
                addClient(client).then(() => { e.target.reset(); updateClientsTable(); alert('Cliente agregado.'); bootstrap.Modal.getInstance(document.getElementById('addClientModal'))?.hide(); })
                                 .catch(err => alert('Error: ' + err));
            });

            document.getElementById('mechanicForm')?.addEventListener('submit', (e) => {
                e.preventDefault(); if (!currentUser?.isAdmin) return;
                const mech = { usuario: document.getElementById('mechanicUsername').value, contraseña: document.getElementById('mechanicPassword').value };
                if (!mech.usuario || !mech.contraseña) { alert("Usuario y contraseña requeridos."); return; }
                addMechanic(mech).then(() => { e.target.reset(); updateMechanicsTable(); alert('Mecánico agregado.'); bootstrap.Modal.getInstance(document.getElementById('addMechanicModal'))?.hide(); })
                                 .catch(err => alert('Error: ' + err));
            });

            document.querySelectorAll('.sidebar .nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault(); const tabId = e.currentTarget.dataset.tab; if (!tabId) return;
                    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    document.querySelectorAll('.tab-content').forEach(c => c.id === `${tabId}Tab` ? c.classList.remove('d-none') : c.classList.add('d-none'));
                    switch(tabId) { // Load data for newly active tab
                        case 'clients': updateClientsTable(); break;
                        case 'appointments': updateCalendar(); break;
                        case 'vehicles': /* No specific load action on tab click, search is manual */ break;
                        case 'inventory': updateInventoryTable(); break;
                        case 'mechanics': if (currentUser?.isAdmin) updateMechanicsTable(); break;
                        case 'analytics': if (currentUser?.isAdmin) generateAnalysis(); break;
                        case 'reports': if (currentUser?.isAdmin) document.getElementById('reportContent').innerHTML = '<p class="text-muted text-center mt-3">Seleccione opciones y genere un reporte.</p>'; break;
                    }
                });
            });

            document.getElementById('maintenanceDataForm')?.addEventListener('submit', (e) => {
                e.preventDefault(); if (!currentUser?.isAdmin) return;
                const data = {
                    kilometraje: parseFloat(document.getElementById('mileage').value),
                    costo: parseFloat(document.getElementById('maintenanceCost').value),
                    tipo: document.getElementById('maintenanceType').value
                };
                if (isNaN(data.kilometraje) || isNaN(data.costo)) { alert("Kilometraje y Costo deben ser números."); return; }
                addMaintenanceData(data).then(() => { e.target.reset(); generateAnalysis(); alert('Dato agregado.'); })
                                        .catch(err => alert('Error: ' + err));
            });

            document.getElementById('appointmentForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const clientSel = document.getElementById('appointmentClient');
                const clientId = clientSel.value;
                const clientName = clientSel.options[clientSel.selectedIndex]?.text.split(' (')[0] || 'Cliente Desconocido'; // Extract name part
                const date = document.getElementById('appointmentDate').value;
                const time = document.getElementById('appointmentTime').value;
                const service = document.getElementById('appointmentService').value;
                const notes = document.getElementById('appointmentNotes').value;
                if (!clientId || !date || !time || !service) { alert("Complete campos requeridos."); return; }
                const appDateTime = new Date(`${date}T${time}`);
                if (isNaN(appDateTime.getTime())) { alert("Fecha/Hora inválida."); return; }
                const app = { clienteId: parseInt(clientId), clientName, fecha: appDateTime.toISOString(), service, notes };
                addAppointment(app).then(() => { bootstrap.Modal.getInstance(document.getElementById('appointmentModal'))?.hide(); e.target.reset(); alert('Cita agendada.'); })
                                   .catch(err => alert('Error: ' + err));
            });

            const calMonthInput = document.getElementById('calendarMonth');
            if (calMonthInput) {
                const today = new Date();
                calMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                calMonthInput.addEventListener('change', updateCalendar);
            }

            const reportMonthInput = document.getElementById('reportMonth');
            if (reportMonthInput) {
                 const today = new Date();
                reportMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            }

            document.getElementById('vehicleSearchBtn')?.addEventListener('click', searchVehicle);
            document.getElementById('vehicleSearch')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchVehicle(); });

            // Initial setup calls if needed, or rely on tab clicks.
            // showMainScreen might already call some of these.

        })
        .catch(error => {
            console.error('Error fatal al inicializar la aplicación:', error);
            document.body.innerHTML = `<div class="alert alert-danger m-5">Error crítico al iniciar la base de datos. Verifique la consola y recargue. Detalles: ${error.message || error}</div>`;
        });
});