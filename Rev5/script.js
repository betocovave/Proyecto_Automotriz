// Configuración inicial
let db;
let currentUser = null;

// Configuración de Socket.IO
const socket = io();

// Inicialización de la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.error("Tu navegador no soporta IndexedDB");
            reject("Tu navegador no soporta IndexedDB");
            return;
        }

        const request = indexedDB.open('AutomotrizDB', 4); // Incrementamos la versión

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos:', event.target.error);
            reject(event.target.error);
        };

        request.onblocked = (event) => {
            console.warn('La base de datos está bloqueada. Por favor, cierre otras pestañas con esta aplicación.');
        };

        request.onupgradeneeded = (event) => {
            console.log('Actualizando la base de datos...');
            db = event.target.result;

            // Crear almacén de citas si no existe
            if (!db.objectStoreNames.contains('citas')) {
                const citasStore = db.createObjectStore('citas', { keyPath: 'id', autoIncrement: true });
                citasStore.createIndex('fecha', 'fecha', { unique: false });
                citasStore.createIndex('clienteId', 'clienteId', { unique: false });
                citasStore.createIndex('status', 'status', { unique: false });
            }

            // Crear almacén de inventario si no existe
            if (!db.objectStoreNames.contains('inventario')) {
                const inventarioStore = db.createObjectStore('inventario', { keyPath: 'id', autoIncrement: true });
                inventarioStore.createIndex('categoria', 'category', { unique: false });
                inventarioStore.createIndex('proveedor', 'supplier', { unique: false });
            }

            // Eliminar almacenes existentes si existen
            if (db.objectStoreNames.contains('clientes')) {
                db.deleteObjectStore('clientes');
            }
            if (db.objectStoreNames.contains('mecanicos')) {
                db.deleteObjectStore('mecanicos');
            }
            if (db.objectStoreNames.contains('mantenimientos')) {
                db.deleteObjectStore('mantenimientos');
            }

            // Crear almacén de clientes
            const clientesStore = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
            clientesStore.createIndex('nombre', 'nombre', { unique: false });

            // Crear almacén de mecánicos
            const mecanicosStore = db.createObjectStore('mecanicos', { keyPath: 'id', autoIncrement: true });
            mecanicosStore.createIndex('usuario', 'usuario', { unique: true });

            // Crear almacén de mantenimientos
            const mantenimientosStore = db.createObjectStore('mantenimientos', { keyPath: 'id', autoIncrement: true });
            mantenimientosStore.createIndex('fecha', 'fecha', { unique: false });
            mantenimientosStore.createIndex('tipo', 'tipo', { unique: false });

            console.log('Base de datos actualizada correctamente');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Base de datos inicializada correctamente');

            // Manejar errores de versión
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

        request.onerror = () => {
            reject('Error al buscar usuario');
        };
    });
}

// Funciones de gestión de clientes
function addClient(client) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['clientes'], 'readwrite');
        const store = transaction.objectStore('clientes');
        const request = store.add({
            ...client,
            proxima_visita: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al agregar cliente');
    });
}

function getClients() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['clientes'], 'readonly');
        const store = transaction.objectStore('clientes');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al obtener clientes');
    });
}

// Funciones de gestión de mecánicos
function addMechanic(mechanic) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para agregar mecánicos');
            return;
        }

        const transaction = db.transaction(['mecanicos'], 'readwrite');
        const store = transaction.objectStore('mecanicos');
        const request = store.add(mechanic);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al agregar mecánico');
    });
}

function getMechanics() {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para ver mecánicos');
            return;
        }

        const transaction = db.transaction(['mecanicos'], 'readonly');
        const store = transaction.objectStore('mecanicos');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al obtener mecánicos');
    });
}

function deleteMechanic(id) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para eliminar mecánicos');
            return;
        }

        const transaction = db.transaction(['mecanicos'], 'readwrite');
        const store = transaction.objectStore('mecanicos');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error al eliminar mecánico');
    });
}

// Funciones de análisis de datos
function addMaintenanceData(data) {
    return new Promise((resolve, reject) => {
        if (!currentUser) {
            reject('No hay usuario autenticado');
            return;
        }

        // Solo permitir agregar datos si es admin o si el cliente está asignado al mecánico
        if (!currentUser.isAdmin && data.clienteId) {
            // Aquí podrías agregar una verificación adicional para asegurarte
            // de que el cliente está asignado al mecánico
            reject('No tienes permisos para agregar datos de mantenimiento para este cliente');
            return;
        }

        const transaction = db.transaction(['mantenimientos'], 'readwrite');
        const store = transaction.objectStore('mantenimientos');
        const request = store.add({
            ...data,
            fecha: new Date().toISOString(),
            mecanicoId: currentUser.id,
            estado: 'completado'
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al agregar dato de mantenimiento');
    });
}

function getMaintenanceData(period) {
    return new Promise((resolve, reject) => {
        if (!currentUser?.isAdmin) {
            reject('No tienes permisos para ver datos de mantenimiento');
            return;
        }

        const transaction = db.transaction(['mantenimientos'], 'readonly');
        const store = transaction.objectStore('mantenimientos');
        const request = store.getAll();

        request.onsuccess = () => {
            const data = request.result;
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - period);
            
            const filteredData = data.filter(item => 
                new Date(item.fecha) >= cutoffDate
            );
            
            resolve(filteredData);
        };
        request.onerror = () => reject('Error al obtener datos de mantenimiento');
    });
}

// Funciones de regresión lineal
function calculateRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calcular R²
    const meanY = sumY / n;
    const totalSS = y.reduce((a, b) => a + Math.pow(b - meanY, 2), 0);
    const regressionSS = y.reduce((a, b, i) => {
        const predicted = slope * x[i] + intercept;
        return a + Math.pow(predicted - meanY, 2);
    }, 0);
    const rSquared = regressionSS / totalSS;
    
    return { slope, intercept, rSquared };
}

function generateAnalysis() {
    const period = parseInt(document.getElementById('analysisPeriod').value);
    const type = document.getElementById('analysisType').value;

    getMaintenanceData(period).then(data => {
        if (data.length === 0) {
            alert('No hay datos suficientes para el análisis');
            return;
        }

        const x = data.map(item => item.kilometraje);
        const y = data.map(item => item.costo);

        const regression = calculateRegression(x, y);
        
        // Actualizar estadísticas
        document.getElementById('slope').textContent = regression.slope.toFixed(4);
        document.getElementById('intercept').textContent = regression.intercept.toFixed(2);
        document.getElementById('rSquared').textContent = regression.rSquared.toFixed(4);
        
        // Calcular predicción para 100,000 km
        const prediction = regression.slope * 100000 + regression.intercept;
        document.getElementById('prediction').textContent = `$${prediction.toFixed(2)}`;

        // Crear gráfico
        const ctx = document.getElementById('regressionChart').getContext('2d');
        
        // Destruir gráfico existente si hay uno
        if (window.myChart instanceof Chart) {
            window.myChart.destroy();
        }

        // Crear puntos de la línea de regresión
        const minX = Math.min(...x);
        const maxX = Math.max(...x);
        const regressionLine = [
            { x: minX, y: regression.slope * minX + regression.intercept },
            { x: maxX, y: regression.slope * maxX + regression.intercept }
        ];

        window.myChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Datos de Mantenimiento',
                        data: data.map(item => ({
                            x: item.kilometraje,
                            y: item.costo
                        })),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Línea de Regresión',
                        data: regressionLine,
                        type: 'line',
                        fill: false,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
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
                        }
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
                                return `${context.dataset.label}: (${context.parsed.x} km, $${context.parsed.y})`;
                            }
                        }
                    }
                }
            }
        });
    }).catch(error => {
        alert(error);
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
    
    // Actualizar la interfaz según el tipo de usuario
    if (currentUser.isAdmin) {
        // Mostrar todas las opciones para el admin
        document.querySelectorAll('.nav-link').forEach(link => {
            link.parentElement.classList.remove('d-none');
        });
        updateClientsTable();
        updateMechanicsTable();
    } else {
        // Para mecánicos, ocultar las pestañas de mecánicos y análisis
        document.querySelector('[data-tab="mechanics"]').parentElement.classList.add('d-none');
        document.querySelector('[data-tab="analytics"]').parentElement.classList.add('d-none');
        // Mostrar solo la pestaña de clientes
        document.querySelector('[data-tab="clients"]').click();
        updateClientsTable();
    }
}

function updateClientsTable() {
    getClients().then(clients => {
        const tbody = document.getElementById('clientsTableBody');
        tbody.innerHTML = '';
        clients.forEach(client => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${client.id}</td>
                <td>${client.nombre}</td>
                <td>${client.correo}</td>
                <td>${client.modelo_carro}</td>
                <td>${client.revision}</td>
                <td>${client.proxima_visita}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="showClientDetails(${client.id})">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    ${currentUser.isAdmin ? `
                        <button class="btn btn-danger btn-sm ms-1" onclick="deleteClient(${client.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(error => {
        alert(error);
    });
}

function updateMechanicsTable() {
    getMechanics().then(mechanics => {
        const tbody = document.getElementById('mechanicsTableBody');
        tbody.innerHTML = '';
        mechanics.forEach(mechanic => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${mechanic.id}</td>
                <td>${mechanic.usuario}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteMechanic(${mechanic.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(error => {
        alert(error);
    });
}

// Función para crear el mecánico por defecto
function createDefaultMechanic() {
    const defaultMechanic = {
        usuario: 'george1',
        contraseña: '0000'
    };

    const transaction = db.transaction(['mecanicos'], 'readwrite');
    const store = transaction.objectStore('mecanicos');
    const index = store.index('usuario');
    
    // Verificar si ya existe
    const request = index.get(defaultMechanic.usuario);
    
    request.onsuccess = (event) => {
        if (!event.target.result) {
            // Si no existe, lo creamos
            store.add(defaultMechanic);
            console.log('Mecánico por defecto creado');
        }
    };
}

// Función para obtener el historial de visitas de un cliente
function getClientHistory(clientId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['mantenimientos'], 'readonly');
        const store = transaction.objectStore('mantenimientos');
        const request = store.getAll();

        request.onsuccess = () => {
            const visits = request.result.filter(visit => visit.clienteId === clientId);
            resolve(visits);
        };

        request.onerror = () => reject('Error al obtener el historial');
    });
}

// Función para mostrar los detalles del cliente
function showClientDetails(clientId) {
    const transaction = db.transaction(['clientes'], 'readonly');
    const store = transaction.objectStore('clientes');
    const request = store.get(clientId);

    request.onsuccess = (event) => {
        const client = event.target.result;
        if (client) {
            // Actualizar la información en el modal
            document.getElementById('modalClientName').textContent = client.nombre;
            document.getElementById('modalClientEmail').textContent = client.correo;
            document.getElementById('modalCarModel').textContent = client.modelo_carro;
            document.getElementById('modalLastRevision').textContent = client.revision;

            // Obtener y mostrar el historial de visitas
            getClientHistory(clientId).then(visits => {
                const tbody = document.getElementById('visitHistoryTable');
                tbody.innerHTML = '';
                
                if (visits.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay visitas registradas</td></tr>';
                    return;
                }

                visits.forEach(visit => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${new Date(visit.fecha).toLocaleDateString()}</td>
                        <td>${visit.tipo}</td>
                        <td>${visit.mecanicoId ? visit.mecanicoId : 'N/A'}</td>
                        <td>$${visit.costo.toFixed(2)}</td>
                        <td><span class="badge bg-success">Completado</span></td>
                    `;
                    tbody.appendChild(tr);
                });

                // Solo mostrar el gráfico de gastos si es admin
                const chartContainer = document.querySelector('#clientDetailsModal .card:last-child');
                if (currentUser.isAdmin) {
                    chartContainer.classList.remove('d-none');
                    // Crear gráfico de gastos
                    const ctx = document.getElementById('clientExpensesChart').getContext('2d');
                    
                    if (window.clientExpensesChart instanceof Chart) {
                        window.clientExpensesChart.destroy();
                    }

                    const monthlyData = {};
                    visits.forEach(visit => {
                        const month = new Date(visit.fecha).toLocaleString('default', { month: 'long' });
                        monthlyData[month] = (monthlyData[month] || 0) + visit.costo;
                    });

                    window.clientExpensesChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: Object.keys(monthlyData),
                            datasets: [{
                                label: 'Gastos Mensuales',
                                data: Object.values(monthlyData),
                                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Costo ($)'
                                    }
                                }
                            }
                        }
                    });
                } else {
                    chartContainer.classList.add('d-none');
                }
            });

            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('clientDetailsModal'));
            modal.show();
        }
    };
}

// Funciones para el manejo de citas
function showAppointmentModal() {
    // Cargar la lista de clientes en el select
    const select = document.getElementById('appointmentClient');
    select.innerHTML = '<option value="">Seleccione un cliente</option>';
    
    getClients().then(clients => {
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.nombre} - ${client.modelo_carro}`;
            select.appendChild(option);
        });
    });

    // Establecer fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').min = today;

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
    modal.show();
}

function addAppointment(appointment) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['citas'], 'readwrite');
        const store = transaction.objectStore('citas');
        const request = store.add({
            ...appointment,
            createdBy: currentUser.id,
            status: 'pendiente'
        });

        request.onsuccess = () => {
            updateCalendar();
            resolve(request.result);
        };
        request.onerror = () => reject('Error al agendar la cita');
    });
}

function getAppointments(startDate, endDate) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['citas'], 'readonly');
        const store = transaction.objectStore('citas');
        const request = store.getAll();

        request.onsuccess = () => {
            const appointments = request.result.filter(appointment => {
                const appointmentDate = new Date(appointment.fecha);
                return appointmentDate >= startDate && appointmentDate <= endDate;
            });
            resolve(appointments);
        };
        request.onerror = () => reject('Error al obtener las citas');
    });
}

function updateCalendar() {
    const monthInput = document.getElementById('calendarMonth');
    const [year, month] = monthInput.value.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    getAppointments(firstDay, lastDay).then(appointments => {
        const tbody = document.getElementById('appointmentCalendar');
        tbody.innerHTML = '';

        // Crear filas para cada hora (8:00 AM a 6:00 PM)
        for (let hour = 8; hour <= 18; hour++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${hour}:00</td>`;

            // Crear celdas para cada día de la semana
            for (let day = 1; day <= 6; day++) {
                const td = document.createElement('td');
                const appointmentsAtTime = appointments.filter(app => {
                    const appDate = new Date(app.fecha);
                    return appDate.getDay() === day && appDate.getHours() === hour;
                });

                if (appointmentsAtTime.length > 0) {
                    appointmentsAtTime.forEach(app => {
                        td.innerHTML += `
                            <div class="appointment-card ${app.status}">
                                <small>${app.clientName}</small><br>
                                <small>${app.service}</small>
                            </div>
                        `;
                    });
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
    });
}

// Funciones para el manejo de inventario
function showInventoryModal() {
    const modal = new bootstrap.Modal(document.getElementById('inventoryModal'));
    modal.show();
}

function saveInventoryItem() {
    const part = {
        code: document.getElementById('partCode').value,
        name: document.getElementById('partName').value,
        category: document.getElementById('partCategory').value,
        stock: parseInt(document.getElementById('partStock').value),
        minStock: parseInt(document.getElementById('partMinStock').value),
        price: parseFloat(document.getElementById('partPrice').value),
        supplier: document.getElementById('partSupplier').value,
        location: document.getElementById('partLocation').value
    };

    addInventoryItem(part).then(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal'));
        modal.hide();
        document.getElementById('inventoryForm').reset();
        updateInventoryTable();
    }).catch(error => alert(error));
}

function addInventoryItem(part) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');
        const request = store.add(part);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al guardar la pieza');
    });
}

function getInventoryItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['inventario'], 'readonly');
        const store = transaction.objectStore('inventario');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al obtener el inventario');
    });
}

function updateInventoryTable() {
    getInventoryItems().then(items => {
        const tbody = document.getElementById('inventoryTable').querySelector('tbody');
        tbody.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td class="${item.stock <= item.minStock ? 'text-danger' : ''}">${item.stock}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.supplier}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editInventoryItem(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteInventoryItem(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// Funciones para reportes
function generateReport() {
    const type = document.getElementById('reportType').value;
    const month = document.getElementById('reportMonth').value;
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    switch(type) {
        case 'services':
            generateServiceReport(startDate, endDate);
            break;
        case 'mechanics':
            generateMechanicReport(startDate, endDate);
            break;
        case 'inventory':
            generateInventoryReport();
            break;
        case 'vehicles':
            generateVehicleReport();
            break;
    }
}

function generateServiceReport(startDate, endDate) {
    getAppointments(startDate, endDate).then(appointments => {
        const reportContent = document.getElementById('reportContent');
        const services = {};
        
        appointments.forEach(app => {
            if (!services[app.service]) {
                services[app.service] = { count: 0, totalTime: 0 };
            }
            services[app.service].count++;
        });

        let html = '<h4>Reporte de Servicios</h4>';
        html += '<table class="table"><thead><tr><th>Servicio</th><th>Cantidad</th></tr></thead><tbody>';
        
        for (const [service, data] of Object.entries(services)) {
            html += `<tr><td>${service}</td><td>${data.count}</td></tr>`;
        }
        
        html += '</tbody></table>';
        reportContent.innerHTML = html;
    });
}

function generateMechanicReport(startDate, endDate) {
    getAppointments(startDate, endDate).then(appointments => {
        const reportContent = document.getElementById('reportContent');
        const mechanics = {};
        
        appointments.forEach(app => {
            if (!mechanics[app.mechanicId]) {
                mechanics[app.mechanicId] = { count: 0, services: {} };
            }
            mechanics[app.mechanicId].count++;
            if (!mechanics[app.mechanicId].services[app.service]) {
                mechanics[app.mechanicId].services[app.service] = 0;
            }
            mechanics[app.mechanicId].services[app.service]++;
        });

        let html = '<h4>Reporte de Mecánicos</h4>';
        html += '<table class="table"><thead><tr><th>Mecánico</th><th>Servicios Realizados</th></tr></thead><tbody>';
        
        for (const [mechanicId, data] of Object.entries(mechanics)) {
            html += `<tr><td>${mechanicId}</td><td>${data.count}</td></tr>`;
        }
        
        html += '</tbody></table>';
        reportContent.innerHTML = html;
    });
}

// Funciones para gestión de vehículos
function searchVehicle() {
    const searchTerm = document.getElementById('vehicleSearch').value.toLowerCase();
    getClients().then(clients => {
        const matchingClients = clients.filter(client => 
            client.placa.toLowerCase().includes(searchTerm) || 
            client.nombre.toLowerCase().includes(searchTerm)
        );
        
        if (matchingClients.length > 0) {
            showVehicleDetails(matchingClients[0]);
        } else {
            alert('No se encontraron vehículos');
        }
    });
}

function showVehicleDetails(client) {
    const modal = new bootstrap.Modal(document.getElementById('vehicleModal'));
    
    // Llenar información básica
    document.getElementById('vehiclePlate').textContent = client.placa;
    document.getElementById('vehicleMake').textContent = client.marca_carro;
    document.getElementById('vehicleModel').textContent = client.modelo_carro;
    document.getElementById('vehicleYear').textContent = client.anio_carro;
    document.getElementById('vehicleMileage').textContent = client.kilometraje;
    
    // Llenar documentación
    document.getElementById('vehicleSoat').textContent = client.soat || 'No registrado';
    document.getElementById('vehicleTechReview').textContent = client.revision_tecnica || 'No registrado';
    
    // Calcular próximo mantenimiento
    const nextMaintenance = calculateNextMaintenance(client.kilometraje);
    document.getElementById('nextMaintenance').textContent = nextMaintenance;
    
    // Cargar historial de servicios
    loadVehicleHistory(client.id);
    
    modal.show();
}

function calculateNextMaintenance(kilometraje) {
    const nextKm = Math.ceil(kilometraje / 5000) * 5000;
    return `${nextKm} km`;
}

function loadVehicleHistory(clientId) {
    getAppointments(new Date(0), new Date()).then(appointments => {
        const clientAppointments = appointments.filter(app => app.clienteId === clientId);
        const tbody = document.getElementById('vehicleHistoryTable').querySelector('tbody');
        tbody.innerHTML = '';
        
        clientAppointments.forEach(app => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(app.fecha).toLocaleDateString()}</td>
                <td>${app.service}</td>
                <td>${app.mechanicName || 'No asignado'}</td>
                <td>${app.partsUsed || 'N/A'}</td>
                <td>$${app.cost || '0.00'}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// Función para actualizar la tabla con los nuevos datos
function updateTable(data) {
    const tableBody = document.querySelector('#vehicleTable tbody');
    tableBody.innerHTML = '';

    data.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicle.id}</td>
            <td>${vehicle.marca}</td>
            <td>${vehicle.modelo}</td>
            <td>${vehicle.anio}</td>
            <td>${vehicle.placa}</td>
            <td>${vehicle.estado}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Escuchar actualizaciones del servidor
socket.on('data-update', (data) => {
    updateTable(data);
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initDB()
        .then(() => {
            console.log('Base de datos lista para usar');
            
            // Crear mecánico por defecto
            createDefaultMechanic();
            
            // Login form
            document.getElementById('loginForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                login(username, password)
                    .then(() => {
                        showMainScreen();
                    })
                    .catch(error => {
                        alert(error);
                    });
            });

            // Logout button
            document.getElementById('logoutBtn').addEventListener('click', () => {
                currentUser = null;
                showLoginScreen();
            });

            // Dark mode switch
            document.getElementById('darkModeSwitch').addEventListener('change', (e) => {
                document.body.classList.toggle('dark-mode', e.target.checked);
            });

            // Client form
            document.getElementById('clientForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const client = {
                    nombre: document.getElementById('clientName').value,
                    correo: document.getElementById('clientEmail').value,
                    modelo_carro: document.getElementById('carModel').value,
                    revision: document.getElementById('revisionType').value
                };

                addClient(client)
                    .then(() => {
                        e.target.reset();
                        updateClientsTable();
                    })
                    .catch(error => {
                        alert(error);
                    });
            });

            // Mechanic form
            document.getElementById('mechanicForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const mechanic = {
                    usuario: document.getElementById('mechanicUsername').value,
                    contraseña: document.getElementById('mechanicPassword').value
                };

                addMechanic(mechanic)
                    .then(() => {
                        e.target.reset();
                        updateMechanicsTable();
                    })
                    .catch(error => {
                        alert(error);
                    });
            });

            // Tab navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tab = e.target.closest('.nav-link').dataset.tab;
                    
                    // Update active tab
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    e.target.closest('.nav-link').classList.add('active');
                    
                    // Show selected content
                    document.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.add('d-none');
                    });
                    document.getElementById(`${tab}Tab`).classList.remove('d-none');
                });
            });

            // Maintenance data form
            document.getElementById('maintenanceDataForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    kilometraje: parseFloat(document.getElementById('mileage').value),
                    costo: parseFloat(document.getElementById('maintenanceCost').value),
                    tipo: document.getElementById('maintenanceType').value
                };

                addMaintenanceData(data)
                    .then(() => {
                        e.target.reset();
                        generateAnalysis();
                    })
                    .catch(error => {
                        alert(error);
                    });
            });

            // Formulario de citas
            document.getElementById('appointmentForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const clientId = document.getElementById('appointmentClient').value;
                const date = document.getElementById('appointmentDate').value;
                const time = document.getElementById('appointmentTime').value;
                const service = document.getElementById('appointmentService').value;
                const notes = document.getElementById('appointmentNotes').value;

                // Obtener el nombre del cliente
                getClients().then(clients => {
                    const client = clients.find(c => c.id === parseInt(clientId));
                    if (!client) {
                        alert('Cliente no encontrado');
                        return;
                    }

                    const appointment = {
                        clienteId: parseInt(clientId),
                        clientName: client.nombre,
                        fecha: new Date(`${date}T${time}`).toISOString(),
                        service: service,
                        notes: notes
                    };

                    addAppointment(appointment)
                        .then(() => {
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
                            modal.hide();
                            e.target.reset();
                            alert('Cita agendada correctamente');
                        })
                        .catch(error => {
                            alert(error);
                        });
                });
            });

            // Calendario
            const monthInput = document.getElementById('calendarMonth');
            const today = new Date();
            monthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            monthInput.addEventListener('change', updateCalendar);
            updateCalendar();

            // Inicializar tablas y reportes
            updateInventoryTable();
            
            // Establecer mes actual en el selector de reportes
            const currentDate = new Date();
            document.getElementById('reportMonth').value = 
                `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        })
        .catch(error => {
            console.error('Error al inicializar la base de datos:', error);
            alert('Error al inicializar la base de datos. Por favor, recarga la página.');
        });
}); 